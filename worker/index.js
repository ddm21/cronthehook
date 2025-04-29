const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('../lib/config');

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

async function processJobs() {
  const now = new Date().toISOString();
  console.log(`[Worker] Checking for jobs at ${now} UTC`);
  try {
    // Fetch pending jobs scheduled for now or earlier
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true });
    if (error) {
      console.error('Supabase fetch error:', error);
      return;
    }
    for (const job of jobs) {
      try {
        await axios.post(job.webhook_url, job.payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });
        // On success, mark as completed and set completed_at
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ 
            status: 'completed', 
            last_error: null,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        if (updateError) {
          console.error(`Error updating job ${job.id} to completed:`, updateError);
        } else {
          console.log(`Job ${job.id} completed.`);
        }
      } catch (err) {
        // On failure, increment retries and set status
        const newRetries = job.retries + 1;
        const failed = newRetries >= config.worker.maxRetryAttempts;
        const errorMsg = err.response && err.response.data
          ? JSON.stringify(err.response.data)
          : err.message || 'Unknown error';
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            retries: newRetries,
            status: failed ? 'failed' : 'pending',
            last_error: errorMsg,
            completed_at: failed ? new Date().toISOString() : null // Set completed_at when failed, null if still pending
          })
          .eq('id', job.id);
        if (updateError) {
          console.error(`Error updating job ${job.id} to failed/pending:`, updateError);
        }
        console.error(`Job ${job.id} failed:`, errorMsg);
      }
    }
  } catch (err) {
    console.error('Worker error:', err);
  }
}

async function startWorker() {
  console.log(`[Worker] Starting with poll interval of ${config.worker.pollIntervalSeconds} seconds`);
  console.log(`[Worker] Connecting to Supabase at: ${config.supabase.url}`);
  
  const intervalMs = config.worker.pollIntervalSeconds * 1000;
  
  // Initial run
  await processJobs();
  
  // Set up interval for subsequent runs
  setInterval(async () => {
    await processJobs();
  }, intervalMs);
}

if (require.main === module) {
  startWorker().catch((err) => {
    console.error('Fatal worker error:', err);
    process.exit(1);
  });
} 