#!/usr/bin/env bash
# Sends log-in codes through Twilio Verify (see docs/onboarding.md › Real text
# messages): finds or makes a Verify service for 6-digit codes in your Twilio
# account, then makes it Supabase Auth's SMS provider. Safe to run again.
#
#   bash scripts/setup-twilio-verify.sh
#
# It asks for your Twilio Account SID and Auth Token (Twilio Console home page)
# and a Supabase access token (supabase.com/dashboard/account/tokens), or reads
# TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and SUPABASE_ACCESS_TOKEN. Secrets are
# never put on a command line, so they stay out of shell history and `ps`.
set -euo pipefail

cd "$(dirname "$0")/.."

SERVICE_NAME='Seat Watcher' # Twilio's text reads "Your Seat Watcher verification code is: 123456"

# The Supabase project the app uses, from .env.local.
url=$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' .env.local 2>/dev/null | cut -d= -f2- || true)
ref=$(printf '%s' "$url" | sed -E 's#^https://([a-z0-9]+)\.supabase\.co/?$#\1#')
if [[ ! "$ref" =~ ^[a-z0-9]+$ ]]; then
  echo "Couldn't find the Supabase project: set EXPO_PUBLIC_SUPABASE_URL in .env.local first (see .env.example)." >&2
  exit 1
fi

account_sid=${TWILIO_ACCOUNT_SID:-}
auth_token=${TWILIO_AUTH_TOKEN:-}
supabase_token=${SUPABASE_ACCESS_TOKEN:-}
[[ -n "$account_sid" ]] || read -rp 'Twilio Account SID (starts with AC): ' account_sid
[[ -n "$auth_token" ]] || { read -rsp 'Twilio Auth Token: ' auth_token && echo; }
[[ -n "$supabase_token" ]] || { read -rsp 'Supabase access token (starts with sbp_): ' supabase_token && echo; }

# curl that prints the server's answer and stops when it says no.
call() {
  local out
  if ! out=$(curl -sS --fail-with-body "$@"); then
    printf '%s\n' "$out" >&2
    return 1
  fi
  printf '%s' "$out"
}
# The credentials go to curl as config files, not arguments.
twilio() { call -K <(printf 'user = "%s:%s"\n' "$account_sid" "$auth_token") "$@"; }
supabase() { call -K <(printf 'header = "Authorization: Bearer %s"\n' "$supabase_token") "$@"; }

echo "Checking the Twilio account…"
account_type=$(twilio "https://api.twilio.com/2010-04-01/Accounts/$account_sid.json" | jq -r .type)

echo "Finding or making the \"$SERVICE_NAME\" Verify service…"
service_sid=$(twilio 'https://verify.twilio.com/v2/Services' |
  jq -r --arg name "$SERVICE_NAME" 'first(.services[] | select(.friendly_name == $name) | .sid) // empty')
if [[ -n "$service_sid" ]]; then
  # The app's code field takes exactly 6 digits.
  twilio -X POST "https://verify.twilio.com/v2/Services/$service_sid" --data-urlencode 'CodeLength=6' >/dev/null
else
  service_sid=$(twilio -X POST 'https://verify.twilio.com/v2/Services' \
    --data-urlencode "FriendlyName=$SERVICE_NAME" --data-urlencode 'CodeLength=6' | jq -r .sid)
fi

echo "Switching Supabase project $ref to Twilio Verify…"
jq -n --arg sid "$account_sid" --arg token "$auth_token" --arg service "$service_sid" '{
  external_phone_enabled: true,
  sms_provider: "twilio_verify",
  sms_twilio_verify_account_sid: $sid,
  sms_twilio_verify_auth_token: $token,
  sms_twilio_verify_message_service_sid: $service
}' | supabase -X PATCH "https://api.supabase.com/v1/projects/$ref/config/auth" \
  -H 'Content-Type: application/json' --data-binary @- >/dev/null

provider=$(supabase "https://api.supabase.com/v1/projects/$ref/config/auth" | jq -r .sms_provider)
echo
echo "Done. Supabase sends log-in codes with: $provider (Verify service $service_sid)."
if [[ "$account_type" == 'Trial' ]]; then
  echo "Your Twilio account is still a trial, so it can only text numbers verified in Twilio" \
    "(Console › Phone Numbers › Verified Caller IDs). Upgrade it to text anyone."
fi
echo "No app rebuild needed: ask for a code in the app again."
