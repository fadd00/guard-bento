import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 10, duration: '10s' };
export default function () {
  const response = http.get(`${__ENV.GUARD_URL || 'http://localhost:8787'}/api/hit?enforce=sliding-log&limit=10&window=10`);
  check(response, { 'status is a limiter result': (value) => value.status === 200 || value.status === 429 });
}
