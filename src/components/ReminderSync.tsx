import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { planReminders } from '@/reminders/plan';
import { askForReminders, onReminderOpened, reminderPermission, syncReminders } from '@/reminders/scheduler';
import { useAppLock } from '@/security/lock';
import { useData } from '@/state/data';

/** Turned off from the Desk. */
export const REMINDERS_OFF_KEY = 'reminders.off';
/** Set once we've asked for notification permission, so we ask only once. */
const ASKED_KEY = 'device.remindersAsked';

/**
 * Keeps the phone's pending reminders in step with current loans. Asks for
 * notification permission the first time a loan has a due date.
 */
export function ReminderSync() {
  const { items, settings, actions } = useData();
  const { enabled: discreet } = useAppLock();
  const last = useRef<string | null>(null);
  const off = settings[REMINDERS_OFF_KEY] === '1';
  const asked = settings[ASKED_KEY] === '1';

  useEffect(() => onReminderOpened((id) => router.push({ pathname: '/item/[id]', params: { id } })), []);

  useEffect(() => {
    const plan = off ? [] : planReminders(items, Date.now(), discreet);
    const signature = JSON.stringify(plan);
    if (signature === last.current) return;
    let live = true;
    (async () => {
      let permission = await reminderPermission();
      if (plan.length && permission === 'undetermined' && !asked) {
        await actions.setSetting(ASKED_KEY, '1');
        permission = (await askForReminders()) ? 'granted' : 'denied';
      }
      if (!live) return;
      if (permission === 'granted' || plan.length === 0) {
        await syncReminders(plan);
        last.current = signature;
      }
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [items, off, discreet, asked, actions]);

  return null;
}
