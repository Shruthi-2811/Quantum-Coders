import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      trialId,
      patientName,
      patientSummary,
    } = body;

    if (!trialId) {
      return NextResponse.json(
        { error: "Trial ID is required." },
        { status: 400 }
      );
    }

    if (!patientSummary || !patientSummary.trim()) {
      return NextResponse.json(
        { error: "Patient summary is required." },
        { status: 400 }
      );
    }

    console.log("Matching patient:", patientName || "Unknown");

    const { data: criteria, error: criteriaError } =
      await supabaseAdmin
        .from("trial_criteria")
        .select("*")
        .eq("trial_id", trialId);

    if (criteriaError) {
      return NextResponse.json(
        {
          error: "Could not load trial criteria.",
          details: criteriaError.message,
        },
        { status: 500 }
      );
    }

    if (!criteria || criteria.length === 0) {
      return NextResponse.json(
        {
          error: "No eligibility criteria found for this trial.",
        },
        { status: 404 }
      );
    }

    const patientText = patientSummary.toLowerCase();

    const results = criteria.map((criterion) => {
      const criterionText =
        criterion.criterion_text.toLowerCase();

      const words = criterionText
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word: string) => word.length > 4);

      let matches = 0;

      for (const word of words) {
        if (patientText.includes(word)) {
          matches++;
        }
      }

      const matchPercentage =
        words.length > 0
          ? Math.round((matches / words.length) * 100)
          : 0;

      const matched = matchPercentage >= 30;

      return {
        criterionId: criterion.id,
        type: criterion.criterion_type,
        criterion: criterion.criterion_text,
        matched,
        matchPercentage,
      };
    });

    const totalCriteria = results.length;

    const matchedCriteria = results.filter(
      (result) => result.matched
    ).length;

    const eligibilityScore =
      totalCriteria > 0
        ? Math.round(
            (matchedCriteria / totalCriteria) * 100
          )
        : 0;

    const exclusionFailures = results.filter(
      (result) =>
        result.type === "exclusion" &&
        result.matched
    );

    let eligibilityStatus = "Likely Eligible";

    if (exclusionFailures.length > 0) {
      eligibilityStatus = "Not Eligible";
    } else if (
      results.some(
        (result) =>
          result.type === "inclusion" &&
          !result.matched
      )
    ) {
      eligibilityStatus = "Potentially Eligible";
    }

    return NextResponse.json({
      success: true,

      patient: {
        name: patientName || "Anonymous Patient",
        summary: patientSummary,
      },

      trial: {
        id: trialId,
      },

      eligibility: {
        score: eligibilityScore,
        status: eligibilityStatus,
      },

      summary: {
        totalCriteria,
        matchedCriteria,
        failedCriteria:
          totalCriteria - matchedCriteria,
        exclusionFailures:
          exclusionFailures.length,
      },

      results,

      criticalContraindications:
        exclusionFailures,
    });
  } catch (error) {
    console.error("PATIENT MATCHING ERROR:", error);

    return NextResponse.json(
      {
        error: "Patient matching failed.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}