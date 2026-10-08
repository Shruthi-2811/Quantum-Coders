import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    // 1. Get uploaded file
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    console.log("PDF received:", file.name);

    // 2. Convert PDF to bytes
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    // 3. Read PDF
    const pdf = await getDocumentProxy(pdfData);

    // 4. Extract text
    const extracted = await extractText(pdf, {
      mergePages: true,
    });

    // Fix for unpdf TypeScript issue
    const extractedText = String(extracted.text ?? "");

    console.log(
      "PDF text extracted. Characters:",
      extractedText.length
    );

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from the PDF. Please upload a text-based PDF.",
        },
        { status: 400 }
      );
    }

    // 5. Create trial title
    const title = file.name.replace(/\.pdf$/i, "");

    console.log("Saving trial to Supabase...");

    // 6. Save trial
    const { data: trial, error: trialError } = await supabaseAdmin
      .from("trials")
      .insert({
        title,
        protocol_text: extractedText,
      })
      .select()
      .single();

    if (trialError) {
      console.error("SUPABASE TRIAL ERROR:", trialError);

      return NextResponse.json(
        {
          error: "Could not save trial.",
          details: trialError.message,
        },
        { status: 500 }
      );
    }

    console.log("Trial created:", trial.id);

    // 7. Extract inclusion/exclusion criteria
    const criteria = extractCriteria(extractedText);

    console.log("Criteria extracted:", criteria.length);

    if (criteria.length === 0) {
      return NextResponse.json(
        {
          error:
            "The PDF was uploaded successfully, but no inclusion/exclusion criteria were found.",
          trialId: trial.id,
        },
        { status: 400 }
      );
    }

    // 8. Prepare criteria for database
    const criteriaRows = criteria.map((item) => ({
      trial_id: trial.id,
      criterion_type: item.type,
      criterion_text: item.text,
    }));

    console.log("Saving criteria to Supabase...");

    // 9. Save criteria
    const { data: savedCriteria, error: criteriaError } =
      await supabaseAdmin
        .from("trial_criteria")
        .insert(criteriaRows)
        .select();

    if (criteriaError) {
      console.error("SUPABASE CRITERIA ERROR:", criteriaError);

      return NextResponse.json(
        {
          error: "Could not save criteria.",
          details: criteriaError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "Criteria saved:",
      savedCriteria?.length ?? 0
    );

    // 10. Return success
    return NextResponse.json({
      success: true,
      message: "Protocol processed successfully.",
      trialId: trial.id,
      trialTitle: title,
      criteriaCount: savedCriteria?.length ?? 0,
      criteria: savedCriteria,
    });
  } catch (error) {
    console.error("PROTOCOL PROCESSING ERROR:", error);

    return NextResponse.json(
      {
        error: "Protocol processing failed.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Extract inclusion and exclusion criteria
 * from the text extracted from the PDF.
 */
function extractCriteria(text: string) {
  const results: {
    type: "inclusion" | "exclusion";
    text: string;
  }[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentType:
    | "inclusion"
    | "exclusion"
    | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect Inclusion heading
    if (
      lower.includes("inclusion criteria") ||
      lower === "inclusion" ||
      lower.includes("inclusion")
    ) {
      currentType = "inclusion";
      continue;
    }

    // Detect Exclusion heading
    if (
      lower.includes("exclusion criteria") ||
      lower === "exclusion" ||
      lower.includes("exclusion")
    ) {
      currentType = "exclusion";
      continue;
    }

    if (!currentType) {
      continue;
    }

    // Numbered criteria:
    // 1. Age >= 18
    // 2) Diagnosis of hypertension
    const numberedMatch = line.match(
      /^(?:\d+[\.\)])\s*(.+)$/
    );

    if (numberedMatch) {
      const criterionText = numberedMatch[1].trim();

      if (criterionText.length > 5) {
        results.push({
          type: currentType,
          text: criterionText,
        });
      }

      continue;
    }

    // Bullet criteria:
    // - Age >= 18
    // • Diagnosis of hypertension
    if (line.startsWith("•") || line.startsWith("-")) {
      const criterionText = line
        .replace(/^[-•]\s*/, "")
        .trim();

      if (criterionText.length > 5) {
        results.push({
          type: currentType,
          text: criterionText,
        });
      }
    }
  }

  return results;
}