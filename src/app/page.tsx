"use client";

import React from "react";
import { askQuestion, handleUploadPdf } from "./_actions";

export default function Home() {
  const [uploadPdfResponse, setUploadPdfResponse] = React.useState<
    string | null
  >(null);
  const [questionResponse, setQuestionResponse] = React.useState<string | null>(
    null
  );
  return (
    <main className="flex justify-center min-h-screen flex-col items-center space-y-12">
      <div className="p-8 bg-slate-800 rounded-lg">
        <form
          className="space-y-4 w-[36rem]"
          encType="multipart/form-data"
          action={async (formData) => {
            const { message } = await handleUploadPdf(formData);
            setUploadPdfResponse(message);
          }}
        >
          <label className="font-semibold space-y-4">
            <div>Drop a PDF file here! 🗳</div>
            <input
              name="pdfFile"
              type="file"
              accept="application/pdf"
              className="block cursor-pointer w-full border shadow-sm rounded-md text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 bg-slate-900 border-gray-700 text-gray-400 file:bg-transparent file:border-0 file:mr-4 file:py-3 file:px-4 file:bg-gray-700 file:text-gray-400 file:hover:bg-white file:hover:text-black file:transition-all"
            />
          </label>
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-white text-gray-700 rounded-md px-4 py-2"
            >
              Upload
            </button>
          </div>
          {uploadPdfResponse && (
            <div className="bg-gray-500 p-4">{uploadPdfResponse}</div>
          )}
        </form>
      </div>
      <div className="p-8 bg-slate-800 rounded-lg">
        <form
          className="space-y-4 w-[36rem]"
          action={async (formData) => {
            const { message } = await askQuestion(formData);
            setQuestionResponse(message);
          }}
        >
          <label className="font-semibold space-y-4">
            <div>Ask a question! ❓</div>
            <input
              name="question"
              type="text"
              placeholder="How did The Beatles come together as a band?"
              className="block p-4 w-full border shadow-sm rounded-md text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 bg-slate-900 border-gray-700 text-gray-400"
            />
          </label>
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-white text-gray-700 rounded-md px-4 py-2"
            >
              Ask
            </button>
          </div>
          {questionResponse && (
            <div className="bg-gray-500 p-4">{questionResponse}</div>
          )}
        </form>
      </div>
    </main>
  );
}
