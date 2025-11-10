import React, { useEffect, useState } from "react";
import { FaBolt, FaRegClock, FaLightbulb, FaChargingStation } from "react-icons/fa";
import "./RecommendationPage.css";

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

        const finalData = combined.map((item) => {
          let insight = "";

          if (item.avgUsage && item.avgUsage > 8) {
            insight = "⚠️ High usage — consider using during off-peak hours.";
          } else if (item.avgUsage && item.avgUsage < 2) {
            insight = "✅ Excellent efficiency — keep it up!";
          } else {
            insight = "💡 Balanced usage — maintain your current schedule.";
          }

          if (item.avgUnits && item.avgUnits > 5) {
            insight += " Try energy-saving settings or newer models.";
          }

          return { ...item, insight };
        });

        setRecommendations(finalData);
        setMessage("✅ Recommendations ready!");
      })
      .catch(() => setMessage("❌ Failed to fetch recommendations."));
  }, []);

  return (
    <div className="recommendation-page">
      <header className="recommendation-header">
        <h2>⚡ Smart Appliance Recommendations</h2>
        <p>{message}</p>
      </header>

      <div className="recommendation-grid">
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <div className="icon-section">
                <FaBolt className="icon" />
              </div>
              <h3>{rec.appliance}</h3>

              <div className="stats">
                {rec.avgUsage && (
                  <p>
                    <FaRegClock className="stat-icon" /> <strong>Avg Usage:</strong>{" "}
                    {rec.avgUsage} hrs/day
                  </p>
                )}
                {rec.avgUnits && (
                  <p>
                    <FaChargingStation className="stat-icon" />{" "}
                    <strong>Avg Consumption:</strong> {rec.avgUnits} kWh/day
                  </p>
                )}
              </div>

              {rec.usageMessage && <p className="usage-msg">💡 {rec.usageMessage}</p>}
              {rec.unitMessage && (
                <p className="unit-msg">🔋 {rec.unitMessage}</p>
              )}

              <div className="insight-box">
                <FaLightbulb className="insight-icon" />
                <p>{rec.insight}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-data">No recommendations available yet.</p>
        )}
      </div>
    </div>
  );
}

export default RecommendationPage;
