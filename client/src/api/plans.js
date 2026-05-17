import http from './http';

export async function getClientPlans(clientId) {
  const { data } = await http.get(`/api/clients/${clientId}/plans`);
  return data;
}
export const getPlansForClient = getClientPlans;

export async function getActivePlan(clientId) {
  const { data } = await http.get(`/api/clients/${clientId}/plans/active`);
  return data;
}

export async function getPlanForWeek(clientId, date) {
  const { data } = await http.get(`/api/clients/${clientId}/plans/week`, {
    params: { date },
  });
  return data;
}

export async function createPlan(clientId, payload) {
  const { data } = await http.post(`/api/clients/${clientId}/plans`, payload);
  return data;
}

export async function getPlan(planId) {
  const { data } = await http.get(`/api/plans/${planId}`);
  return data;
}

export async function updatePlan(planId, payload) {
  const { data } = await http.put(`/api/plans/${planId}`, payload);
  return data;
}

export async function deletePlan(planId) {
  const { data } = await http.delete(`/api/plans/${planId}`);
  return data;
}

export async function copyPlan(planId, sourcePlanId) {
  const { data } = await http.post(`/api/plans/${planId}/copy-from/${sourcePlanId}`);
  return data;
}
export const copyFromPlan = copyPlan;

export async function addMeal(planId, payload) {
  const { data } = await http.post(`/api/plans/${planId}/meals`, payload);
  return data;
}

export async function updateMeal(mealId, payload) {
  const { data } = await http.put(`/api/meals/${mealId}`, payload);
  return data;
}

export async function deleteMeal(mealId) {
  const { data } = await http.delete(`/api/meals/${mealId}`);
  return data;
}

export async function getGoal(clientId) {
  try {
    const { data } = await http.get(`/api/clients/${clientId}/goals`);
    return data;
  } catch (e) {
    if (e.response && e.response.status === 404) return null;
    throw e;
  }
}

export function flattenPlanMeals(planResponse) {
  if (!planResponse || !Array.isArray(planResponse.meals)) return [];
  return planResponse.meals.flatMap((dayBucket) =>
    dayBucket.meals.map((m) => ({ ...m, day_of_week: dayBucket.day }))
  );
}
