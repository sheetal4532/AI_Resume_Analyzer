import React, { useState, useEffect } from "react";
import constants, {
  buildPresenceChecklist,
  METRIC_CONFIG,
} from "./constants";

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
  const [aiReady, setAiReady] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [presenceChecklist, setPresenceChecklist] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.puter?.ai?.chat) {
        setAiReady(true);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const extractPDFText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      text +=
        content.items
          .map((item) => item.str)
          .join(" ") + "\n";
    }

    return text;
  };

  const parseJSONResponse = (reply) => {
    try {
      const match = reply.match(/\{[\s\S]*\}/);

      const parsed = match ? JSON.parse(match[0]) : {};

      if (!parsed.overallScore && !parsed.error) {
        throw new Error("Invalid AI Response");
      }

      return parsed;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const analyzeResume = async (text) => {
    const prompt =
      constants.ANALYZE_RESUME_PROMPT.replace(
        "{{DOCUMENT_TEXT}}",
        text
      );

    const response = await window.puter.ai.chat(
      [
        {
          role: "system",
          content:
            "You are an expert ATS Resume Reviewer.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "gpt-4o",
      }
    );

    const result = parseJSONResponse(
      typeof response === "string"
        ? response
        : response.message?.content || ""
    );

    return result;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload PDF only");
      return;
    }

    setUploadedFile(file);
    setAnalysis(null);
    setIsLoading(true);

    try {
      const text = await extractPDFText(file);

      setResumeText(text);

      setPresenceChecklist(
        buildPresenceChecklist(text)
      );

      const result = await analyzeResume(text);

      setAnalysis(result);
    } catch (err) {
      alert(err.message);
    }

    setIsLoading(false);
  };

  const reset = () => {
    setUploadedFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
  };
  return (
  <div className="min-h-screen bg-main-gradient p-6">
    <div className="max-w-6xl mx-auto">

      {/* Header */}

      <div className="text-center mb-10">
        <h1 className="text-6xl font-light bg-gradient-to-r from-cyan-300 via-sky-300 to-teal-300 bg-clip-text text-transparent">
          AI Resume Analyzer
        </h1>

        <p className="text-slate-400 mt-3">
          Upload your PDF resume and get instant AI feedback
        </p>
      </div>

      {/* Upload */}

      {!uploadedFile && !isLoading && (
        <div className="upload-area">

          <div className="upload-zone">

            <div className="text-7xl mb-6">
              📄
            </div>

            <h2 className="text-3xl text-white mb-3">
              Upload Your Resume
            </h2>

            <p className="text-slate-400 mb-8">
              PDF files only • Get instant analysis
            </p>

            <input
              id="resume"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={!aiReady}
            />

            <label
              htmlFor="resume"
              className={`btn-primary inline-block ${
                !aiReady
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Choose PDF File
            </label>

          </div>

        </div>
      )}

      {/* Loading */}

      {isLoading && (

        <div className="max-w-md mx-auto text-center py-20">

          <div className="loading-spinner"></div>

          <h2 className="text-2xl text-white mt-6">
            Analyzing Resume...
          </h2>

          <p className="text-slate-400 mt-2">
            AI is reviewing your resume.
          </p>

        </div>

      )}

      {/* Analysis Header */}

      {analysis && uploadedFile && (

        <div className="space-y-8">

          <div className="file-info-card">

            <div className="flex justify-between items-center">

              <div className="flex items-center gap-5">

                <div className="icon-container-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">

                  <span className="text-4xl">
                    📄
                  </span>

                </div>

                <div>

                  <h2 className="text-2xl font-bold text-green-400">
                    Analysis Complete
                  </h2>

                  <p className="text-slate-400">
                    {uploadedFile.name}
                  </p>

                </div>

              </div>

              <button
                onClick={reset}
                className="btn-secondary"
              >
                🔄 New Analysis
              </button>

            </div>

          </div>
                    {/* Overall Score */}

          <div className="score-card">

            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

              <div>

                <p className="text-cyan-300 uppercase tracking-widest text-sm">
                  Overall Score
                </p>

                <h2 className="text-7xl font-bold text-white mt-2">
                  {analysis.overallScore}
                </h2>

                <p className="text-slate-300 mt-4 max-w-xl">
                  {analysis.summary}
                </p>

              </div>

              <div className="w-40 h-40 rounded-full border-[12px] border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">

                <span className="text-5xl font-bold text-cyan-300">
                  {analysis.overallScore.split("/")[0]}
                </span>

              </div>

            </div>

          </div>


          {/* Performance Metrics */}

          <div className="section-card">

            <h2 className="text-2xl font-bold text-white mb-8">
              Performance Metrics
            </h2>

            <div className="space-y-7">

              {METRIC_CONFIG.map((metric) => {

                const score =
                  analysis.performanceMetrics?.[metric.key] ??
                  metric.defaultValue;

                return (

                  <div key={metric.key}>

                    <div className="flex justify-between mb-2">

                      <span className="text-slate-200">

                        {metric.icon} {metric.label}

                      </span>

                      <span className="text-cyan-300 font-bold">

                        {score}/10

                      </span>

                    </div>

                    <div className="progress-bar">

                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${metric.colorClass}`}
                        style={{
                          width: `${score * 10}%`,
                        }}
                      />

                    </div>

                  </div>

                );

              })}

            </div>

          </div>
                    {/* Strengths & Improvements */}

          <div className="grid lg:grid-cols-2 gap-6">

            <div className="section-card">

              <h2 className="text-2xl font-bold text-green-400 mb-6">
                ✅ Strengths
              </h2>

              <div className="space-y-3">
                {analysis.strengths?.map((item, index) => (
                  <div key={index} className="list-item-green">
                    <span>✔️</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

            </div>

            <div className="section-card">

              <h2 className="text-2xl font-bold text-orange-400 mb-6">
                ⚠ Improvements
              </h2>

              <div className="space-y-3">
                {analysis.improvements?.map((item, index) => (
                  <div key={index} className="list-item-orange">
                    <span>⚠</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* Keywords */}

          <div className="section-card">

            <h2 className="text-2xl font-bold text-blue-300 mb-6">
              Keywords Found
            </h2>

            <div className="flex flex-wrap gap-3">
              {analysis.keywords?.map((keyword, index) => (
                <span key={index} className="keyword-tag">
                  {keyword}
                </span>
              ))}
            </div>

          </div>

          {/* ATS Checklist */}

          <div className="section-card">

            <h2 className="text-2xl font-bold text-violet-300 mb-6">
              ATS Checklist
            </h2>

            <div className="space-y-3">
              {analysis.atsChecklist?.map((item, index) => (
                <div key={index} className="list-item-cyan">
                  🤖 {item}
                </div>
              ))}
            </div>

          </div>

          {/* Presence Checklist */}

          <div className="section-card">

            <h2 className="text-2xl font-bold text-cyan-300 mb-6">
              Resume Presence Checklist
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {presenceChecklist.map((item, index) => (

                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    item.present
                      ? "border-green-500 bg-green-500/10"
                      : "border-red-500 bg-red-500/10"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <span className="text-white">
                      {item.label}
                    </span>

                    <span className="text-xl">
                      {item.present ? "✅" : "❌"}
                    </span>

                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* Action Items */}

          <div className="section-card">

            <h2 className="text-2xl font-bold text-yellow-300 mb-6">
              Action Items
            </h2>

            <div className="space-y-3">

              {analysis.actionItems?.map((item, index) => (

                <div
                  key={index}
                  className="list-item-orange"
                >
                  🚀 {item}
                </div>

              ))}

            </div>

          </div>

          {/* Pro Tips */}

          <div className="section-card">

            <h2 className="text-2xl font-bold text-emerald-300 mb-6">
              Pro Tips
            </h2>

            <div className="space-y-3">

              {analysis.proTips?.map((tip, index) => (

                <div
                  key={index}
                  className="list-item-emerald"
                >
                  💡 {tip}
                </div>

              ))}

            </div>

          </div>

        </div>

      )}

    </div>

  </div>
);

}

export default App;