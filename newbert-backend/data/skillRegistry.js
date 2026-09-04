const SKILL_REGISTRY = Object.freeze({
  dbms: {
    id: "dbms",
    name: "DBMS",
    category: "core_cs",
    subskills: ["sql", "normalization", "transactions", "indexing"],
    defaultLevel: "intermediate",
    description: "Relational database management systems, ACID properties, schema design, and query optimization."
  },
  oop: {
    id: "oop",
    name: "OOP",
    category: "core_cs",
    subskills: ["encapsulation", "inheritance", "polymorphism", "abstraction", "solid_principles"],
    defaultLevel: "intermediate",
    description: "Object-oriented programming principles, modular code organization, and design patterns."
  },
  computer_networks: {
    id: "computer_networks",
    name: "Computer Networks",
    category: "core_cs",
    subskills: ["osi_model", "tcp_ip", "dns", "http_https", "routing"],
    defaultLevel: "intermediate",
    description: "Network protocols, client-server architectures, socket communication, and transport layers."
  },
  operating_systems: {
    id: "operating_systems",
    name: "Operating Systems",
    category: "core_cs",
    subskills: ["processes_threads", "concurrency", "deadlocks", "virtual_memory", "scheduling"],
    defaultLevel: "intermediate",
    description: "OS architecture, process synchronization, memory management, and file systems."
  },
  system_design: {
    id: "system_design",
    name: "System Design",
    category: "design",
    subskills: ["scalability", "load_balancing", "caching", "microservices", "database_sharding"],
    defaultLevel: "advanced",
    description: "High-level distributed systems design, data flow, throughput, and fault tolerance."
  },
  dsa: {
    id: "dsa",
    name: "DSA",
    category: "problem_solving",
    subskills: ["arrays_strings", "trees_graphs", "dynamic_programming", "recursion", "time_complexity"],
    defaultLevel: "intermediate",
    description: "Data structures and algorithms, problem-solving paradigms, and asymptotic analysis."
  },
  react: {
    id: "react",
    name: "React",
    category: "development",
    subskills: ["components", "hooks", "state_management", "virtual_dom", "lifecycle"],
    defaultLevel: "intermediate",
    description: "Modern component-based frontend engineering with hooks, state, and rendering optimizations."
  },
  nodejs: {
    id: "nodejs",
    name: "Node.js",
    category: "development",
    subskills: ["event_loop", "streams", "express", "async_programming", "middleware"],
    defaultLevel: "intermediate",
    description: "Event-driven asynchronous backend runtime for scalable network services."
  },
  rest_api: {
    id: "rest_api",
    name: "REST APIs",
    category: "development",
    subskills: ["http_methods", "status_codes", "request_validation", "authentication", "api_design"],
    defaultLevel: "intermediate",
    description: "RESTful architectural constraints, resource modelling, endpoints, and error contracts."
  },
  javascript: {
    id: "javascript",
    name: "JavaScript",
    category: "languages",
    subskills: ["es6_syntax", "promises", "closures", "dom_manipulation", "event_handling"],
    defaultLevel: "intermediate",
    description: "Core scripting language of the web, modern syntax, and asynchronous execution."
  },
  typescript: {
    id: "typescript",
    name: "TypeScript",
    category: "languages",
    subskills: ["type_annotations", "interfaces", "generics", "type_guards", "utility_types"],
    defaultLevel: "intermediate",
    description: "Typed superset of JavaScript providing compile-time type safety and scalability."
  },
  python: {
    id: "python",
    name: "Python",
    category: "languages",
    subskills: ["syntax", "oop_python", "data_structures", "libraries", "file_handling"],
    defaultLevel: "intermediate",
    description: "High-level expressive language for backend web services, automation, and data science."
  },
  java: {
    id: "java",
    name: "Java",
    category: "languages",
    subskills: ["core_java", "collections_framework", "multithreading", "jvm_internals", "streams"],
    defaultLevel: "intermediate",
    description: "Strongly typed enterprise language widely used in service-based and product engineering."
  },
  cpp: {
    id: "cpp",
    name: "C++",
    category: "languages",
    subskills: ["pointers_memory", "stl", "oop_cpp", "templates", "memory_management"],
    defaultLevel: "intermediate",
    description: "High-performance systems language with STL for competitive programming and systems."
  },
  sql: {
    id: "sql",
    name: "SQL",
    category: "databases",
    subskills: ["select_queries", "joins", "aggregations", "subqueries", "ddl_dml"],
    defaultLevel: "intermediate",
    description: "Structured query language for querying, manipulating, and aggregating relational data."
  },
  mongodb: {
    id: "mongodb",
    name: "MongoDB",
    category: "databases",
    subskills: ["document_model", "aggregation_pipeline", "indexes", "schema_validation"],
    defaultLevel: "intermediate",
    description: "Document-oriented NoSQL database for rapid iterative product development."
  },
  postgresql: {
    id: "postgresql",
    name: "PostgreSQL",
    category: "databases",
    subskills: ["advanced_sql", "jsonb", "indexes_explain", "constraints", "transactions"],
    defaultLevel: "intermediate",
    description: "Advanced open-source relational database with strong ACID guarantees and extensibility."
  },
  git: {
    id: "git",
    name: "Git",
    category: "tools",
    subskills: ["commits", "branching", "merge_rebase", "pull_requests", "conflict_resolution"],
    defaultLevel: "beginner",
    description: "Distributed version control system essential for collaborative engineering."
  },
  docker: {
    id: "docker",
    name: "Docker",
    category: "tools",
    subskills: ["dockerfiles", "container_lifecycle", "images", "docker_compose", "networking"],
    defaultLevel: "intermediate",
    description: "Containerization platform for reliable development, testing, and deployment parity."
  },
  html_css: {
    id: "html_css",
    name: "HTML / CSS",
    category: "development",
    subskills: ["semantic_html", "flexbox_grid", "responsive_design", "css_variables"],
    defaultLevel: "beginner",
    description: "Core markup and styling foundations for web interface development."
  },
  aptitude: {
    id: "aptitude",
    name: "Aptitude & Reasoning",
    category: "interview_prep",
    subskills: ["quantitative", "logical_reasoning", "verbal_ability", "data_interpretation"],
    defaultLevel: "beginner",
    description: "Quantitative and logical problem-solving essential for on-campus and service assessments."
  },
  communication: {
    id: "communication",
    name: "Communication & Behavioral",
    category: "interview_prep",
    subskills: ["project_explanation", "hr_questions", "articulation", "behavioral_scenarios"],
    defaultLevel: "beginner",
    description: "Technical articulation, structured project explanation, and behavioral interviews."
  }
});

function getSkillFromRegistry(skillId) {
  if (!skillId) return null;
  const key = String(skillId).toLowerCase().replace(/[-\s]/g, "_");
  return SKILL_REGISTRY[key] || SKILL_REGISTRY[skillId] || null;
}

function getAllRegistrySkills() {
  return Object.values(SKILL_REGISTRY);
}

module.exports = {
  SKILL_REGISTRY,
  getSkillFromRegistry,
  getAllRegistrySkills,
};
