import type { WineWithCount } from './types';
import { getDrinkWindow, getPersonalDrinkMoment } from './utils';

export type DrinkingPriority = {
  wine: WineWithCount;
  urgency: 'urgent' | 'now' | 'later' | 'unknown';
  reason: string;
  estimated: boolean;
  deadline?: number;
};

/** Advisory only. Never changes stock, ratings or manual drinking windows. */
export function rankDrinkingPriorities(wines: WineWithCount[], year = new Date().getFullYear()): DrinkingPriority[] {
  const entries = wines.filter(w => w.bottleCount > 0).map(wine => {
    const window = getDrinkWindow(wine);
    const personal = getPersonalDrinkMoment(wine);
    const deadline = window.to;
    let urgency: DrinkingPriority['urgency'];
    let reason: string;
    if (deadline !== undefined && deadline < year) {
      urgency = 'urgent';
      reason = `Drinkvenster eindigde in ${deadline}; proef eerst één fles.`;
    } else if (deadline !== undefined && deadline <= year + 1 && (!window.from || window.from <= year)) {
      urgency = 'urgent';
      reason = `Drinkvenster loopt ${deadline === year ? 'dit jaar' : 'volgend jaar'} af.`;
    } else if (window.from !== undefined && window.from > year) {
      urgency = 'later';
      reason = `Bewaar bij voorkeur tot ${window.from}.`;
    } else if (window.from !== undefined || deadline !== undefined) {
      urgency = 'now';
      reason = personal && personal.from <= year && personal.to >= year
        ? `Nu in jouw persoonlijke voorkeursperiode (${personal.from}–${personal.to}).`
        : 'Binnen het geschatte of opgegeven drinkvenster.';
    } else {
      urgency = 'unknown';
      reason = 'Nog geen betrouwbaar drinkvenster beschikbaar.';
    }
    return { wine, urgency, reason, estimated: window.estimated, deadline };
  });
  const order: Record<DrinkingPriority['urgency'], number> = { urgent: 0, now: 1, later: 2, unknown: 3 };
  return entries.sort((a,b) => order[a.urgency] - order[b.urgency] ||
    (a.deadline ?? 9999) - (b.deadline ?? 9999) ||
    a.wine.producer.localeCompare(b.wine.producer, 'nl'));
}
