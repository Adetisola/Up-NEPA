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
    let notificationsLogged = 0

    // Fatigue cap: Max 3 notifications per user per 6 hours
    async function canSendNotification(userId: string): Promise<boolean> {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', sixHoursAgo)
        
      if (error) {
        console.error(`Fatigue check error for user ${userId}:`, error)
        return true // fail open
      }
      return (count !== null && count < 3)
    }

    async function processNotification(user: any, title: string, body: string, actions: any[]) {
      const canSend = await canSendNotification(user.id)
      if (!canSend) {
        console.log(`Fatigue cap reached for user ${user.id}`)
        return false
      }

      // 1. Log to DB
      const { error: dbError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title,
        body
      })
      if (!dbError) notificationsLogged++

      // 2. Send push (if they have a subscription)
      if (user.push_subscription) {
        try {
          await webpush.sendNotification(user.push_subscription, JSON.stringify({
            title,
            body,
            areaId: user.area_id,
            userId: user.id,
            actions
          }))
          notificationsSent++
        } catch (e) {
          console.error(`Push failed for user ${user.id}:`, e)
        }
      }
      return true
    }

    if (type === 'neighbour' && areaId) {
      // ── NEIGHBOUR TRIGGER ─────────────────────────────────
      // Triggered when an area just got power. Notify users in other areas.
      console.log(`Evaluating neighbour trigger for area: ${areaId}`)
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, push_subscription, area_id')
        .neq('area_id', areaId) // Users not in the triggered area

      if (!error && users) {
        for (const user of users) {
          await processNotification(user, "Up NEPA ⚡", "Your neighbours just got light — has it reached you?", [
            { action: 'report-on', title: '✅ Yes it has' },
            { action: 'report-off', title: '❌ Not yet' }
          ])
        }
      }
    } else if (type === 'flash' && areaId) {
      // ── FLASH SUPPLY TRIGGER ──────────────────────────────
      console.log(`Evaluating flash supply trigger for area: ${areaId}`)
      const { data: users } = await supabase
        .from('users')
        .select('id, push_subscription, area_id')
        .eq('area_id', areaId)

      if (users) {
        for (const user of users) {
          await processNotification(user, "Up NEPA ⚡", "Quick flash or stable supply? Help your neighbours know if light is still on 👀", [
            { action: 'report-on', title: '✅ Still on' },
            { action: 'report-off', title: '❌ Went off again' }
          ])
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

        if (users) {
          for (const user of users) {
            await processNotification(user, "Up NEPA ⚡", "Light still dey? Quick confirm for your area 🙏", [
              { action: 'report-on', title: '✅ Still ON' },
              { action: 'report-off', title: '❌ It went off' }
            ])
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

      if (users) {
        for (const user of users) {
          await processNotification(user, "Up NEPA ⚡", "Abi light dey your side? Help your neighbours know 👀", [
            { action: 'report-on', title: '✅ YES it\'s up' },
            { action: 'report-off', title: '❌ NO it\'s out' }
          ])
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: notificationsSent, logged: notificationsLogged }), {
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
