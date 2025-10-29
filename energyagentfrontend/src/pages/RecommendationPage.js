import React, { useEffect, useState } from "react";

function RecommendationPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [message, setMessage] = useState("Fetching recommendations...");

  const isSimilarName = (a, b) => {
    a = a.toLowerCase().replace(/\(units\)|\s/g, "");
    b = b.toLowerCase().replace(/\(units\)|\s/g, "");
    if (a === b) return true;
    const synonyms = {
      tv: "television",
      ac: "airconditioner",
      fridge: "refrigerator",
      motor: "motorpump",
    };
    return synonyms[a] === b || synonyms[b] === a;
  };

  useEffect(() => {
    fetch("http://127.0.0.1:5000/recommendations")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage("⚠️ " + data.error);
          return;
        }

        const items = data.recommendations;
        const combined = [];

        items.forEach((rec) => {
          const baseName = rec.appliance.replace(/\(Units\)/, "").trim();
          let found = combined.find((r) => isSimilarName(r.appliance, baseName));

          if (!found) {
            found = {
              appliance: baseName,
              usageMessage: "",
              unitMessage: "",
              avgUsage: null,
              avgUnits: null,
            };
            combined.push(found);
          }

          // Extract numeric values (e.g., “3.5 hours” or “12 kWh”)
          const numericMatch = rec.recommendation.match(/(\d+(\.\d+)?)/);
          const numericValue = numericMatch ? parseFloat(numericMatch[1]) : null;

          if (rec.appliance.includes("(Units)")) {
            found.unitMessage = rec.recommendation;
            found.avgUnits = numericValue;
          } else {
            found.usageMessage = rec.recommendation;
            found.avgUsage = numericValue;
          }
        });

        // Add smart recommendation logic
        const finalData = combined.map((item) => {
          let insight = "";

          // Example logic: modify based on usage intensity
          if (item.avgUsage && item.avgUsage > 8) {
            insight = "⚠️ High daily usage — try using it during off-peak hours or reduce runtime.";
          } else if (item.avgUsage && item.avgUsage < 2) {
            insight = "✅ Great efficiency — appliance is used optimally!";
          } else {
            insight = "💡 Moderate usage — maintain current schedule for balanced energy consumption.";
          }

          if (item.avgUnits && item.avgUnits > 5) {
            insight += " Consider energy-saving models or switching it off completely when idle.";
          }

          return { ...item, insight };
        });

        setRecommendations(finalData);
        setMessage("✅ Detailed energy insights generated!");
      })
      .catch(() => setMessage("❌ Failed to fetch recommendations."));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center" }}>⚡ Appliance-wise Energy Recommendations</h2>
      <p style={{ textAlign: "center", color: "#555" }}>{message}</p>

      {recommendations.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          {recommendations.map((rec, index) => (
            <div
              key={index}
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "22px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
              }}
            >
              <h3 style={{ color: "#4CAF50", marginBottom: "10px" }}>
                {rec.appliance}
              </h3>

              {rec.avgUsage && (
                <p style={{ margin: "6px 0", color: "#444" }}>
                  ⏱️ <strong>Avg Usage:</strong> {rec.avgUsage} hours/day
                </p>
              )}
              {rec.avgUnits && (
                <p style={{ margin: "6px 0", color: "#444" }}>
                  ⚡ <strong>Avg Consumption:</strong> {rec.avgUnits} kWh/day
                </p>
              )}

              {rec.usageMessage && (
                <p style={{ color: "#555", marginTop: "10px" }}>
                  💡 {rec.usageMessage}
                </p>
              )}
              {rec.unitMessage && (
                <p style={{ color: "#777", marginTop: "5px", fontSize: "0.95em" }}>
                  🔋 {rec.unitMessage}
                </p>
              )}

              <p
                style={{
                  marginTop: "12px",
                  background: "#f8f9fa",
                  padding: "10px",
                  borderRadius: "8px",
                  color: "#333",
                }}
              >
                {rec.insight}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecommendationPage;
