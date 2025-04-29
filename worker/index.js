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
        // On success, mark as completed
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ status: 'completed', last_error: null })
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

if (require.main === module) {
  processJobs().then(() => process.exit(0)).catch((err) => {
    console.error('Fatal worker error:', err);
    process.exit(1);
  });
} 