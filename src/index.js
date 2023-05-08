import Integrator from './integrator.js'

async function run() {
  const integrator = new Integrator();

  await integrator.fetchChangedFiles();
  await integrator.filterChangedFiles();
  await integrator.reviewAndComment();

  return 'complete';
}

run();
