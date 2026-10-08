"use client";

import { useState } from "react";

export default function Home() {
  const [trialId, setTrialId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientSummary, setPatientSummary] = useState("");

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    setError("");
    setResult(null);

    if (!trialId.trim()) {
      setError("Please enter the Trial ID.");
      return;
    }

    if (!patientSummary.trim()) {
      setError("Please enter the patient summary.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trialId,
          patientName,
          patientSummary,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            "Patient matching failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "white",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            fontWeight: "700",
            marginBottom: "10px",
          }}
        >
          NexusClin
        </h1>

        <p
          style={{
            color: "#aab3c5",
            marginBottom: "35px",
          }}
        >
          Clinical Trial Patient Eligibility Matcher
        </p>

        {/* Patient Information */}

        <div
          style={{
            background: "#151c2f",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              marginBottom: "20px",
            }}
          >
            Patient Information
          </h2>

          <label>Trial ID</label>

          <input
            value={trialId}
            onChange={(e) =>
              setTrialId(e.target.value)
            }
            placeholder="Enter Trial ID"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #374151",
              background: "#0f172a",
              color: "white",
            }}
          />

          <label>Patient Name</label>

          <input
            value={patientName}
            onChange={(e) =>
              setPatientName(e.target.value)
            }
            placeholder="Example: Patient P001"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #374151",
              background: "#0f172a",
              color: "white",
            }}
          />

          <label>Patient Summary</label>

          <textarea
            value={patientSummary}
            onChange={(e) =>
              setPatientSummary(e.target.value)
            }
            placeholder={`Example:

Age: 56
Sex: Male
Diagnosis: Hypertension
Blood Pressure: 145/92
eGFR: 72
Diabetes: No
Heart Failure: No
Current Medication: Amlodipine`}
            rows={12}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              borderRadius: "8px",
              border: "1px solid #374151",
              background: "#0f172a",
              color: "white",
              resize: "vertical",
            }}
          />

          <button
            onClick={handleMatch}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "20px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {loading
              ? "Matching Patient..."
              : "Match Patient"}
          </button>
        </div>

        {/* Error */}

        {error && (
          <div
            style={{
              background: "#3b1720",
              border: "1px solid #7f1d1d",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "25px",
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}

        {result && (
          <div
            style={{
              background: "#151c2f",
              borderRadius: "16px",
              padding: "25px",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                marginBottom: "20px",
              }}
            >
              Eligibility Result
            </h2>

            <div
              style={{
                fontSize: "42px",
                fontWeight: "700",
                marginBottom: "10px",
              }}
            >
              {result.eligibility.score}%
            </div>

            <p
              style={{
                fontSize: "20px",
                marginBottom: "25px",
              }}
            >
              {result.eligibility.status}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  background: "#0f172a",
                  padding: "18px",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {result.summary.totalCriteria}
                </strong>
                <br />
                Total Criteria
              </div>

              <div
                style={{
                  background: "#0f172a",
                  padding: "18px",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {result.summary.matchedCriteria}
                </strong>
                <br />
                Matched
              </div>

              <div
                style={{
                  background: "#0f172a",
                  padding: "18px",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {result.summary.failedCriteria}
                </strong>
                <br />
                Failed
              </div>
            </div>

            <h3
              style={{
                fontSize: "20px",
                marginBottom: "15px",
              }}
            >
              Criteria Analysis
            </h3>

            {result.results.map(
              (item: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    marginBottom: "12px",
                    borderRadius: "10px",
                    background: "#0f172a",
                    borderLeft: `4px solid ${
                      item.matched
                        ? "#22c55e"
                        : "#ef4444"
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#94a3b8",
                      marginBottom: "6px",
                    }}
                  >
                    {item.type.toUpperCase()}
                  </div>

                  <div
                    style={{
                      marginBottom: "8px",
                    }}
                  >
                    {item.criterion}
                  </div>

                  <strong>
                    {item.matched
                      ? "✓ MATCHED"
                      : "✗ NOT MATCHED"}
                  </strong>
                </div>
              )
            )}

            {result.criticalContraindications
              ?.length > 0 && (
              <div
                style={{
                  marginTop: "25px",
                  padding: "18px",
                  background: "#3b1720",
                  borderRadius: "10px",
                }}
              >
                <h3>
                  Critical Contraindications
                </h3>

                {result.criticalContraindications.map(
                  (item: any, index: number) => (
                    <p key={index}>
                      ⚠ {item.criterion}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}