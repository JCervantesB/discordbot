const { rollNarrativeDie } = require('../dist/lib/dice.js');

function simulate(regionSlug, iterations = 10000) {
  const buckets = {
    critical_bad: 0,
    bad: 0,
    neutral: 0,
    good: 0,
    critical_good: 0
  };
  for (let i = 0; i < iterations; i++) {
    const result = rollNarrativeDie([]);
    buckets[result.category]++;
  }
  console.log(`Region: ${regionSlug}`);
  Object.entries(buckets).forEach(([k, v]) => {
    console.log(`${k}: ${(v / iterations * 100).toFixed(2)}% (${v})`);
  });
}

const regions = ['neoterra', 'restos_grisaceos', 'vasto_delta', 'el_hueco', 'cielorritos'];
regions.forEach((r) => simulate(r, 10000));

