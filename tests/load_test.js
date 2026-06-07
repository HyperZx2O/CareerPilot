import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const FAILURE_RATE = new Rate("failed_requests");

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    failed_requests: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const payloads = [
    () => http.get(`${BASE_URL}/health`),
    () => http.get(`${BASE_URL}/api/tracker/dashboard/stats`, {
      headers: { Authorization: "Bearer test-user-id" },
    }),
    () => http.get(`${BASE_URL}/api/tracker/applications`, {
      headers: { Authorization: "Bearer test-user-id" },
    }),
    () => http.get(`${BASE_URL}/api/tracker/goals`, {
      headers: { Authorization: "Bearer test-user-id" },
    }),
    () => http.get(`${BASE_URL}/api/tracker/todos`, {
      headers: { Authorization: "Bearer test-user-id" },
    }),
    () => http.get(`${BASE_URL}/api/tracker/nudge`, {
      headers: { Authorization: "Bearer test-user-id" },
    }),
    () => http.get(`${BASE_URL}/api/jobs/search?q=software+engineer&location=bd`, {
      headers: { Authorization: "Bearer test-user-id" },
    }),
    () => http.post(`${BASE_URL}/api/chat/message`, JSON.stringify({
      message: "What jobs match my profile?",
      session_id: "loadtest",
    }), {
      headers: { Authorization: "Bearer test-user-id", "Content-Type": "application/json" },
    }),
  ];

  const fn = payloads[Math.floor(Math.random() * payloads.length)];
  const res = fn();
  FAILURE_RATE.add(res.status !== 200 && res.status !== 429);
  check(res, {
    "status is 200 or 429": (r) => r.status === 200 || r.status === 429,
  });
  sleep(Math.random() * 2 + 0.5);
}
