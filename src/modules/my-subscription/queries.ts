import { useMutation } from '@tanstack/react-query';
import { resumeMySubscription } from './services';

/** Resume the partner's cancelled subscription (BUG-069). */
export const useResumeMySubscription = () =>
  useMutation({
    mutationFn: resumeMySubscription,
  });
