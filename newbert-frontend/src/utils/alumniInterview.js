const guidance = {
  placement: ['Which company and role?', 'Was it campus, off-campus, or a referral?', 'When did you receive the offer? Salary is optional.'],
  skillsAtSelection: ['Name only skills you used before selection.', 'Where did you use each skill?', 'Your current resume may include skills learned after selection.'],
  projects: ['What problem did the project solve?', 'What did you personally implement?', 'Share a repository or live link if public.', 'What did the interviewer ask about it?'],
  dsaPreparation: ['Which language and topics did you practise?', 'What was your approximate solved count at selection?', 'Keep today’s count separate.'],
  preparationJourney: ['When did you start?', 'Describe two or three phases and what changed.', 'Approximate durations are fine.'],
  interviews: ['Name the company and role.', 'Describe each round and questions you remember.', 'Avoid confidential interview material.'],
  internships: ['What did you work on?', 'What was your own contribution?', 'How did it help your preparation?'],
  resources: ['Which resource did you actually use?', 'What helped, and what did not?', 'Who would you recommend it to?'],
  socialLinks: ['LinkedIn helps readers find your professional profile; it is a self-reported link.', 'GitHub and LeetCode are collected under practice platforms.'],
  advice: ['Describe one action a junior can take this week.', 'Explain why it helped you; your own experience is enough.'],
};
export function interviewGuidance(question) { return guidance[question.id] || ['Share only what you remember and are comfortable publishing.']; }

export async function readResumeText(file) {
  if (!file || file.size > 5 * 1024 * 1024) throw new Error('Choose a PDF or text resume smaller than 5 MB.');
  let text = '';
  if (/\.txt$/i.test(file.name)) text = await file.text();
  else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 15) throw new Error('Choose a resume with 15 pages or fewer.');
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join(''));
      }
      text = pages.join('\n\n');
    } finally { await task.destroy(); }
  } else throw new Error('Choose a PDF or .txt resume.');
  if (text.trim().length < 40) throw new Error('No readable text found. Paste text from a scanned resume instead.');
  if (text.length > 50000) throw new Error('This resume is too long. Paste only the relevant section.');
  return text;
}
