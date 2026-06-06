import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import webpush from "https://esm.sh/web-push@3.6.1"

// Setup web-push with VAPID keys from Supabase Edge Secrets
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const vapidEmail = 'mailto:admin@upnepa.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Basic auth check if needed (or assume triggered securely)
    const payload = await req.json()
    const { type, areaId } = payload

    let notificationsSent = 0

    if (type === 'neighbour' && areaId) {
      // ── NEIGHBOUR TRIGGER ─────────────────────────────────
      // Triggered when an area just got power. Notify users in other areas.
      console.log(`Evaluating neighbour trigger for area: ${areaId}`)
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, push_subscription, area_id')
        .neq('area_id', areaId) // Users not in the triggered area
        .not('push_subscription', 'is', null)

      if (!error && users) {
        for (const user of users) {
          try {
            await webpush.sendNotification(user.push_subscription, JSON.stringify({
              title: "Up NEPA ⚡",
              body: "Your neighbours just got light — has it reached you?",
              areaId: user.area_id,
              userId: user.id,
              actions: [
                { action: 'report-on', title: '✅ Yes it has' },
                { action: 'report-off', title: '❌ Not yet' }
              ]
            }))
            notificationsSent++
          } catch (e) {
            console.error(`Push failed for user ${user.id}:`, e)
          }
        }
      }
    } else if (type === 'stale') {
      // ── STALE DATA TRIGGER ────────────────────────────────
      // Run every hour. Find users whose area was reported ON > 3 hours ago.
      console.log('Evaluating stale data trigger')
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      
      // Get areas that are currently ON but last updated > 3 hours ago
      const { data: staleAreas } = await supabase
        .from('area_status')
        .select('area_id')
        .eq('current_status', 'ON')
        .lt('last_updated', threeHoursAgo)

      if (staleAreas && staleAreas.length > 0) {
        const staleAreaIds = staleAreas.map(a => a.area_id)
        
        const { data: users } = await supabase
          .from('users')
          .select('id, push_subscription, area_id')
          .in('area_id', staleAreaIds)
          .not('push_subscription', 'is', null)

        if (users) {
          for (const user of users) {
            try {
              await webpush.sendNotification(user.push_subscription, JSON.stringify({
                title: "Up NEPA ⚡",
                body: "Light still dey? Quick confirm for your area 🙏",
                areaId: user.area_id,
                userId: user.id,
                actions: [
                  { action: 'report-on', title: '✅ Still ON' },
                  { action: 'report-off', title: '❌ It went off' }
                ]
              }))
              notificationsSent++
            } catch (e) {}
          }
        }
      }
    } else if (type === 'morning' || type === 'evening') {
      // ── ROUTINE CHECK TRIGGER ─────────────────────────────
      // Run at 6am and 6pm. Notify all users to get initial status.
      console.log(`Evaluating routine trigger: ${type}`)
      const { data: users } = await supabase
        .from('users')
        .select('id, push_subscription, area_id')
        .not('push_subscription', 'is', null)

      if (users) {
        for (const user of users) {
          try {
            await webpush.sendNotification(user.push_subscription, JSON.stringify({
              title: "Up NEPA ⚡",
              body: "Abi light dey your side? Help your neighbours know 👀",
              areaId: user.area_id,
              userId: user.id,
              actions: [
                { action: 'report-on', title: '✅ YES it\'s up' },
                { action: 'report-off', title: '❌ NO it\'s out' }
              ]
            }))
            notificationsSent++
          } catch (e) {}
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: notificationsSent }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
