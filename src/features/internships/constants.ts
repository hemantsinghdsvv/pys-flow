import { CurriculumMonth, TaskTypeItem } from "./types";

export const CURRICULUM_PLAN: CurriculumMonth[] = [
  {
    id: "m1",
    title: "Month 1 — Foundation & Observation",
    subtitle: "Build your base: philosophy, asana fundamentals and classroom observation.",
    weeks: [
      {
        id: "m1w1",
        title: "Week 1",
        focus: "Orientation",
        tasks: [
          "Attend orientation — school philosophy, ethics and daily schedule",
          "Study the Yamas and Niyamas with examples from daily life",
          "Observe 3 Hatha yoga classes and take structured notes",
          "Memorise the 12 steps of Surya Namaskar",
          "Start an internship journal with daily reflections",
        ],
      },
      {
        id: "m1w2",
        title: "Week 2",
        focus: "Asana Basics",
        tasks: [
          "Practise and learn 20 standing asanas with Sanskrit names",
          "Study alignment cues for Tadasana, Vrikshasana and Trikonasana",
          "Assist the teacher in one class (props and setup)",
          "Learn basic anatomy: spine, major joints and muscle groups",
        ],
      },
      {
        id: "m1w3",
        title: "Week 3",
        focus: "Breath & Pranayama",
        tasks: [
          "Learn Nadi Shodhana, Bhramari and Kapalbhati fundamentals",
          "Establish a daily 15-minute personal pranayama routine",
          "Observe a pranayama class and note the teaching language",
          "Study contraindications and safety for breathing practices",
        ],
      },
      {
        id: "m1w4",
        title: "Week 4",
        focus: "Review & Assessment",
        tasks: [
          "Lead a 15-minute warm-up for a peer group",
          "Complete the Month 1 written assessment",
          "Submit the Month 1 reflection report to your mentor",
          "Set clear personal goals for Month 2",
        ],
      },
    ],
  },
  {
    id: "m2",
    title: "Month 2 — Practice & Assisting",
    subtitle: "Move from student to assistant: sequencing, cueing and hands-on support.",
    weeks: [
      {
        id: "m2w1",
        title: "Week 5",
        focus: "Sequencing",
        tasks: [
          "Learn the structure of a 60-minute Hatha class",
          "Study peak pose, counter pose and compensation logic",
          "Build 2 sample sequences and present them for feedback",
        ],
      },
      {
        id: "m2w2",
        title: "Week 6",
        focus: "Teaching Skills",
        tasks: [
          "Practise verbal cueing aloud for 5 different asanas",
          "Work on voice modulation and Sanskrit pronunciation",
          "Teach a 20-minute segment to your peer group",
        ],
      },
      {
        id: "m2w3",
        title: "Week 7",
        focus: "Adjustments & Safety",
        tasks: [
          "Learn hands-on adjustments for 10 core asanas",
          "Study common injuries, modifications and contraindications",
          "Assist in 5 live classes from start to finish",
        ],
      },
      {
        id: "m2w4",
        title: "Week 8",
        focus: "Meditation & Philosophy",
        tasks: [
          "Study selected sutras from Patanjali’s Yoga Sutras",
          "Learn a guided meditation and a Yoga Nidra script",
          "Lead a 10-minute guided relaxation session",
          "Submit the Month 2 reflection report",
        ],
      },
    ],
  },
  {
    id: "m3",
    title: "Month 3 — Teaching & Certification",
    subtitle: "Lead classes with confidence and complete your internship portfolio.",
    weeks: [
      {
        id: "m3w1",
        title: "Week 9",
        focus: "Co-Teaching",
        tasks: [
          "Co-teach a full 60-minute class with your mentor",
          "Handle warm-up and cool-down independently",
          "Collect and review student feedback forms",
        ],
      },
      {
        id: "m3w2",
        title: "Week 10",
        focus: "Independent Teaching",
        tasks: [
          "Teach 2 full classes solo under observation",
          "Design a themed class (backbends, hips or twists)",
          "Record one session and review it with your mentor",
        ],
      },
      {
        id: "m3w3",
        title: "Week 11",
        focus: "Content & Community",
        tasks: [
          "Write 3 blog posts or social captions for the school",
          "Help organise a workshop or community yoga camp",
          "Build a personal sequence library and class playlist",
        ],
      },
      {
        id: "m3w4",
        title: "Week 12",
        focus: "Assessment & Handover",
        tasks: [
          "Complete the final practical teaching assessment",
          "Submit your internship portfolio and journal",
          "Present key learnings to the school team",
          "Finish certification formalities and feedback session",
        ],
      },
    ],
  },
];

export const WEEK_INDEX_MAP: Record<string, number> = {};
CURRICULUM_PLAN.forEach((m, mi) => {
  m.weeks.forEach((w, wi) => {
    WEEK_INDEX_MAP[w.id] = mi * 4 + wi;
  });
});

export const DEFAULT_TASK_TYPES: TaskTypeItem[] = [
  { id: "tt-orientation", name: "Orientation", color: "#3b82f6" },
  { id: "tt-observation", name: "Observation", color: "#8b5cf6" },
  { id: "tt-practice",    name: "Practice",    color: "#10b981" },
  { id: "tt-teaching",    name: "Teaching",    color: "#f59e0b" },
  { id: "tt-assessment",  name: "Assessment",  color: "#ef4444" },
  { id: "tt-philosophy",  name: "Philosophy",  color: "#6366f1" },
  { id: "tt-performance", name: "Performance", color: "#ec4899" },
  { id: "tt-report",      name: "Report",      color: "#64748b" },
];

export const TYPE_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#ec4899",
  "#64748b",
  "#14b8a6",
  "#f97316",
];

export const STORAGE_KEY = "pragya-internship-planner-v4";
