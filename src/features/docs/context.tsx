"use client";

import { createContext, useContext } from "react";

import type { CatalogEntry } from "@/types";

/**
 * What a docs page needs to fill itself in. In the console these are the project's real
 * values; on the public site they're clearly placeholders, so a snippet is always
 * copy-pasteable and never pretends to know your project.
 */
export interface DocsEnv {
  /** True inside a project: values are real and in-app links work. */
  scoped: boolean;
  serviceUrl: string;
  projectId: string;
  /** Enabled agents in project scope; the sample contract on the public site. */
  agents: CatalogEntry[];
  /** Project status when scoped, so a page can warn that calls will 403. */
  status: string | null;
  callbackBaseUrl: string;
  /** URL of a docs page in the current scope. */
  docHref: (slug: string) => string;
  /** URL of a console page, or null outside a project. */
  appHref: (path: string) => string | null;
}

const DocsContext = createContext<DocsEnv | null>(null);

export const DocsProvider = DocsContext.Provider;

export function useDocs(): DocsEnv {
  const env = useContext(DocsContext);
  if (!env) throw new Error("useDocs must be used inside <DocsProvider>");
  return env;
}

/** A real contract, so the public docs show something true rather than a made-up shape. */
export const SAMPLE_AGENT: CatalogEntry = {
  agentType: "quiz-generator",
  name: "Quiz Generator",
  description: "Generates a 4-6 question multiple-choice quiz (4 options each, indexed answer) for a specific course module.",
  category: "elearning",
  toolsEnabled: true,
  endpoint: "POST /agents/quiz-generator",
  requestExample: {
    projectId: "educourse",
    initiatedBy: "admin",
    courseId: "course_123",
    moduleIndex: 1,
    environment: "production",
    context: { moduleTitle: "Getting Started", lessonTitles: ["Intro to fire doors", "Common defects"] },
  },
  callbackPath: "/api/v1/admin/courses/:courseId/quiz",
  callbackMethod: "PUT",
  callbackExample: {
    moduleIndex: 1,
    questions: [
      {
        question: "What is the primary purpose of a fire door?",
        options: ["Decoration", "Compartmentation", "Ventilation", "Insulation"],
        answer: 1,
      },
    ],
    agent_initiated: true,
  },
  typicalMaxTokens: 2048,
};
