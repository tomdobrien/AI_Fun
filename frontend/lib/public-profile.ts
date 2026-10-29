import type { Profile } from "./types";

// Public editorial snapshot. Refresh with each published resume update.
// Career details sourced from the Money project’s LinkedIn/Upwork review (October 2026).
// No account, invitation, or file data belongs here.
export const publicProfile: Profile = {
  "displayName": "Thomas OBrien",
  "headline": "Senior Software Engineer",
  "introduction": "I’m Thomas, a software engineer in Cary, North Carolina. I build full-stack applications with C#/.NET and Angular, drawing on a background in semiconductor test engineering, automation, and the systems that connect software to the real world.",
  "location": "Cary, North Carolina",
  "contactEmail": "obrien.tom.d@gmail.com",
  "contactPhone": null,
  "experience": [
    {
      "employer": "CaptiveAire Systems",
      "location": "Raleigh, NC",
      "role": "Senior Software Engineer",
      "workMode": null,
      "startDate": "July 2024",
      "endDate": "Present",
      "responsibilities": [
        "Develop and maintain full-stack business applications using .NET/C# and Angular/TypeScript.",
        "Investigate issues across backend logic and client-side interfaces, improve usability, and simplify business workflows."
      ],
      "projects": []
    },
    {
      "employer": "Wolfspeed",
      "location": "Durham, NC",
      "role": "Senior Staff Test Engineer",
      "workMode": null,
      "startDate": "June 2022",
      "endDate": "July 2024",
      "responsibilities": [
        "Led test-engineering software initiatives, agile development practices, and the Power Test roadmap.",
        "Oversaw R&D Test Engineering capital projects, scope, and resource allocation."
      ],
      "projects": [
        "Migrated the team to Azure DevOps and implemented automated CI/CD pipelines.",
        "Developed Power BI dashboards using SharePoint and Azure data to support project and roadmap decisions.",
        "Applied Six Sigma DMAIC to address codebase fragmentation and improve development efficiency and quality."
      ]
    },
    {
      "employer": "Qorvo",
      "location": "Greensboro, NC",
      "role": "Test Engineering",
      "workMode": null,
      "startDate": "March 2013",
      "endDate": "June 2022",
      "responsibilities": [
        "Developed test conditions and screening criteria for RF, DC, and digital products, and investigated production yield issues.",
        "Led software development for an RF filter test platform supporting multiple hardware configurations through software APIs."
      ],
      "projects": [
        "Built a code-generation platform that converted test cases into test programs, reducing new development time from days to minutes.",
        "Migrated the software repository from TFS to GitLab and established CI/CD pipelines.",
        "Revamped a legacy RF testing API and used multithreading to triple production efficiency.",
        "Developed offline environments for hardware-in-the-loop debugging and integrated frameworks with distributed systems."
      ]
    },
    {
      "employer": "Analog Devices",
      "location": "Greensboro, NC",
      "role": "Applications Engineer Co-op",
      "workMode": null,
      "startDate": "May 2011",
      "endDate": "August 2012",
      "responsibilities": [
        "Supported customers using evaluation platforms and developed test software and hardware."
      ],
      "projects": [
        "Engineered an RF switch assembly and its software API for test automation.",
        "Created an extensible LabVIEW test platform using a producer/consumer task queue."
      ]
    }
  ],
  "education": [
    {
      "institution": "NC State University",
      "location": "Raleigh, NC",
      "degree": "B.S.",
      "fieldOfStudy": "Electrical Engineering",
      "graduationDate": "May 2013"
    },
    {
      "institution": "NC State University",
      "location": "Raleigh, NC",
      "degree": "B.S.",
      "fieldOfStudy": "Computer Engineering",
      "graduationDate": "May 2013"
    }
  ],
  "skills": [
    {
      "name": "C#",
      "category": "Application development"
    },
    {
      "name": ".NET",
      "category": "Application development"
    },
    {
      "name": "Angular",
      "category": "Application development"
    },
    {
      "name": "TypeScript",
      "category": "Application development"
    },
    {
      "name": "SQL",
      "category": "Application development"
    },
    {
      "name": "APIs",
      "category": "Application development"
    },
    {
      "name": "Test automation",
      "category": "Engineering & delivery"
    },
    {
      "name": "GitLab CI/CD",
      "category": "Engineering & delivery"
    },
    {
      "name": "Azure DevOps",
      "category": "Engineering & delivery"
    },
    {
      "name": "Power BI",
      "category": "Engineering & delivery"
    },
    {
      "name": "LabVIEW",
      "category": "Engineering & delivery"
    }
  ],
  "links": [
    {
      "label": "LinkedIn",
      "url": "https://www.linkedin.com/in/tomobrien89/"
    },
    {
      "label": "GitHub",
      "url": "https://github.com/tomdobrien"
    }
  ],
  "selectedWork": [],
  "awards": []
};
