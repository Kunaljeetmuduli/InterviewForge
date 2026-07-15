import { randomUUID } from "node:crypto";

import type {
  Resume,
  ResumeAuthContext,
  ResumeCreateInput,
  ResumeRepository,
} from "./resume.types.js";

export class ResumeNotFoundError extends Error {
  constructor() {
    super("The requested resume was not found.");
    this.name = "ResumeNotFoundError";
  }
}

export class ResumeService {
  constructor(private readonly repository: ResumeRepository) {}

  async createResume(
    context: ResumeAuthContext,
    input: ResumeCreateInput,
  ): Promise<Resume> {
    const resumeId = randomUUID();
    const hasPrimaryResume = await this.repository.hasPrimaryForUser(
      context.user.id,
      context.accessToken,
    );

    return this.repository.createForUser(
      context.user.id,
      context.accessToken,
      {
        id: resumeId,
        ...input,
        storage_path: `${context.user.id}/${resumeId}.pdf`,
        status: "pending",
        processing_stage: null,
        processing_attempt: 0,
        error_code: null,
        error_message: null,
        is_primary: !hasPrimaryResume,
      },
    );
  }

  listResumes(context: ResumeAuthContext): Promise<Resume[]> {
    return this.repository.listForUser(
      context.user.id,
      context.accessToken,
    );
  }

  async getResume(
    context: ResumeAuthContext,
    resumeId: string,
  ): Promise<Resume> {
    const resume = await this.repository.findByIdForUser(
      context.user.id,
      context.accessToken,
      resumeId,
    );

    if (!resume) {
      throw new ResumeNotFoundError();
    }

    return resume;
  }

  async deleteResume(
    context: ResumeAuthContext,
    resumeId: string,
  ): Promise<void> {
    const resume = await this.getResume(context, resumeId);

    await this.repository.removeStorageObject(
      context.accessToken,
      resume.storage_path,
    );
    await this.repository.deleteForUser(
      context.user.id,
      context.accessToken,
      resume.id,
    );
  }
}
