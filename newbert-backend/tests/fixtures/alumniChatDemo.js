// Fictional development fixture. Never imported or seeded by the production server.
module.exports={
 name:'Rahul Verma (demo)',college:{collegeId:'qa-college',name:'QA College (test only)'},branch:'Information Technology',graduationYear:2025,degree:'B.Tech',
 careerPath:'PLACEMENT',placement:{company:'TCS Digital (fictional demo)',role:'Software Engineer',ctc:8},usedDsa:true,
 dsaPreparation:{solvedAtSelection:340,estimated:true,primaryLanguage:'JavaScript',strongTopics:['Arrays','Trees']},
 platforms:['GITHUB','LEETCODE','GEEKSFORGEEKS','CODECHEF'],
 skillsAtSelection:['JavaScript','React','Node.js','MongoDB','SQL','DBMS'].map(name=>({name,category:'OTHER',level:'INTERMEDIATE'})),
 projects:[1,2,3].map(i=>({name:`Demo project ${i}`,description:'Fictional project used only for interface testing',techStack:['React','Node.js']})),
 internships:[{company:'Demo Company',role:'Engineering Intern',mode:'REMOTE',ppo:false}],
 preparation:{startedIn:'YEAR_3',months:8,hoursPerDay:2},advice:'Demo advice: start early and explain what you build.',mentorInterest:'YES',mentorship:{topics:['DSA','Projects'],method:'CHAT',payment:'FREE'},privacy:{'placement.ctc':'PRIVATE'},
};
