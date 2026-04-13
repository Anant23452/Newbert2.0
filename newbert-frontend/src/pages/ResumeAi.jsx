const ResumeAi = () => {
   const handleFileChange = (e) => {
    const file = e.target.files[0];
    setResume(file);
  };

  return <>
  <div className="header">
    <h1 className="text-center text-4xl mt-5 font-bold"> Newbert Resume AI</h1>
    <div className="flex items-center gap-3 text-sm font-medium justify-center mt-5">

  {/* Step 1 */}
  <div className="flex items-center gap-2 ">
    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center font-bold">
      1
    </div>
    <span className="text-orange-500">Upload & JD</span>
  </div>

  <span className="text-gray-400">→</span>

  {/* Step 2 */}
  <div className="flex items-center gap-2">
    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
      2
    </div>
    <span className="text-gray-500">AI Analysis</span>
  </div>

  <span className="text-gray-400">→</span>

  {/* Step 3 */}
  <div className="flex items-center gap-2">
    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
      3
    </div>
    <span className="text-gray-500">Rewritten</span>
  </div>

  <span className="text-gray-400">→</span>

  {/* Step 4 */}
  <div className="flex items-center gap-2 ">
    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
      4
    </div>
    <span className="text-gray-500">Interview Prep</span>
  </div>

</div>
  </div>
  <div className="upload-container flex flex-col items-center justify-center bg-gray-400 p-10 mt-10 rounded-lg h-32 mx-auto w-1/3">
    <input
        className="file-input border-2 border-gray-300 rounded-lg p-2 cursor-pointer"
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
      />
  </div>

  <div className="job-description m-10">
    <h1 className="text-3xl"> Paste Job Description</h1>
      <textarea
      className="job-description-textarea border-2 border-gray-300 rounded-lg p-2 mt-5 w-full"
        placeholder="Paste Job Description here..."
        rows="10"
        cols="50"
        // value={jd}
        // onChange={(e) => setJd(e.target.value)}
      />
  </div>
  <button className="bg-blue-500 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded mx-auto block">
    Submit
  </button>
  </>;
};

export default ResumeAi;