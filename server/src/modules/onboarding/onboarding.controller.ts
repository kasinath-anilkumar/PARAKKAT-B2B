import type { Request, Response } from 'express';
import type { AgencyApplication } from '@prisma/client';
import * as onboardingService from './onboarding.service';
import { checkOnboardingAnomaly } from './anomaly';

/** Applicant-facing view of their own draft — strips the resume token hash. */
function toApplicantView(application: AgencyApplication) {
  const { resumeTokenHash: _omit, ...rest } = application;
  void _omit;
  return rest;
}

export async function createDraft(req: Request, res: Response): Promise<void> {
  const { application, resumeToken } = await onboardingService.createDraft(req.body);
  // Non-blocking abuse signal on public onboarding activity (§11).
  await checkOnboardingAnomaly(req.ip);
  res.status(201).json({
    applicationId: application.id,
    resumeToken,
    lifecycleState: application.lifecycleState,
    application: toApplicantView(application),
  });
}

export async function getDraft(req: Request, res: Response): Promise<void> {
  res.status(200).json({ application: toApplicantView(req.application!) });
}

export async function updateDraft(req: Request, res: Response): Promise<void> {
  const updated = await onboardingService.updateDraft(req.application!, req.body);
  res.status(200).json({ application: toApplicantView(updated) });
}

export async function submitApplication(req: Request, res: Response): Promise<void> {
  const submitted = await onboardingService.submitApplication(req.application!);
  res.status(200).json({
    applicationId: submitted.id,
    lifecycleState: submitted.lifecycleState,
    submittedAt: submitted.submittedAt,
  });
}
