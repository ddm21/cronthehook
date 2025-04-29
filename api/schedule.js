const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { DateTime } = require('luxon');
const config = require('../lib/config');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

const router = express.Router();

// Initialize Supabase client with service role key
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

function isValidISODate(str) {
  // Accepts both 'YYYY-MM-DDTHH:mm:ssZ' and 'YYYY-MM-DD HH:mm:ss+00'
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function parseCustomDateTime(str, timezone) {
  // Expects 'dd-mm-yyyy HH:mm' and a valid IANA timezone string
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/.exec(str);
  if (!match) return null;
  const [, dd, mm, yyyy, HH, min] = match;
  // Use luxon to parse in the given timezone
  const dt = DateTime.fromObject({
    year: Number(yyyy),
    month: Number(mm),
    day: Number(dd),
    hour: Number(HH),
    minute: Number(min),
  }, { zone: timezone || 'UTC' });
  return dt.isValid ? dt : null;
}

// POST /api/schedule
router.post('/schedule', apiKeyAuth, async (req, res) => {
  try {
    const { webhook_url, payload, scheduled_time, timezone } = req.body;
    if (!webhook_url || typeof webhook_url !== 'string') {
      return res.status(400).json({ error: 'webhook_url is required and must be a string' });
    }
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'payload is required and must be an object' });
    }
    if (!scheduled_time || typeof scheduled_time !== 'string') {
      return res.status(400).json({ error: 'scheduled_time is required and must be a string in format dd-mm-yyyy HH:mm' });
    }
    let dt;
    try {
      dt = parseCustomDateTime(scheduled_time, timezone);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid timezone or date format' });
    }
    if (!dt) {
      return res.status(400).json({ error: 'scheduled_time must be in format dd-mm-yyyy HH:mm (24hr) and timezone must be a valid IANA string (e.g., Asia/Kolkata)' });
    }
    const scheduledTimeISO = dt.toUTC().toISO();
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          webhook_url,
          payload,
          scheduled_time: scheduledTimeISO,
          status: 'pending',
          retries: 0,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to schedule job', details: error.message });
    }
    return res.status(201).json({ id: data.id });
  } catch (err) {
    console.error('POST /api/schedule error:', err);
    return res.status(500).json({ error: 'Failed to schedule job', details: err.message });
  }
});

// GET /api/jobs
router.get('/jobs', apiKeyAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('jobs').select('*').order('scheduled_time', { ascending: true });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    }
    return res.json({ jobs: data });
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    return res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
});

// POST /api/jobs/:id/retry
router.post('/jobs/:id/retry', apiKeyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Job id is required' });
    }
    const { data, error } = await supabase
      .from('jobs')
      .update({ status: 'pending', retries: 0, last_error: null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Job not found' });
      }
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to retry job', details: error.message });
    }
    return res.json({ job: data });
  } catch (err) {
    console.error(`POST /api/jobs/${req.params.id}/retry error:`, err);
    return res.status(500).json({ error: 'Failed to retry job', details: err.message });
  }
});

// DELETE /api/jobs/:id/delete
router.delete('/jobs/:id/delete', apiKeyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Job id is required' });
    }
    const { data, error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Job not found' });
      }
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete job', details: error.message });
    }
    return res.json({ message: 'Job deleted', job: data });
  } catch (err) {
    console.error(`DELETE /api/jobs/${req.params.id}/delete error:`, err);
    return res.status(500).json({ error: 'Failed to delete job', details: err.message });
  }
});

module.exports = router; 