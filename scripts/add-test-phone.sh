#!/usr/bin/env bash
# Gives a phone number a fixed log-in code for testing (see docs/onboarding.md ›
# Real text messages): logging in with that number takes that code and sends no
# text, so Twilio isn't asked and nothing is charged. Safe to run again; other
# test numbers are kept.
#
#   bash scripts/add-test-phone.sh 626-695-0214          # makes up a code
#   bash scripts/add-test-phone.sh 626-695-0214 135790   # uses this one
#
# Anyone who knows the code can log in as that number, so every test code stops
# working after TEST_DAYS days (30 unless set). It asks for a Supabase access
# token (supabase.com/dashboard/account/tokens) or reads SUPABASE_ACCESS_TOKEN.
set -euo pipefail

cd "$(dirname "$0")/.."

days=${TEST_DAYS:-30}

# Supabase keys test numbers by their digits; US numbers may leave off the 1.
phone=$(printf '%s' "${1:-}" | tr -cd '0-9')
[[ ${#phone} -eq 10 ]] && phone="1$phone"
if [[ ! "$phone" =~ ^[0-9]{11,15}$ ]]; then
  echo 'Usage: bash scripts/add-test-phone.sh <phone number> [6-digit code]' >&2
  exit 1
fi
if [[ -n "${2:-}" ]]; then
  code=$2
else
  random=$(od -An -N4 -tu4 /dev/urandom | tr -d ' ')
  code=$(printf '%06d' $((random % 1000000)))
fi
if [[ ! "$code" =~ ^[0-9]{6}$ ]]; then
  echo 'The code must be 6 digits, because the app expects 6.' >&2
  exit 1
fi

# The Supabase project the app uses, from .env.local.
url=$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' .env.local 2>/dev/null | cut -d= -f2- || true)
ref=$(printf '%s' "$url" | sed -E 's#^https://([a-z0-9]+)\.supabase\.co/?$#\1#')
if [[ ! "$ref" =~ ^[a-z0-9]+$ ]]; then
  echo "Couldn't find the Supabase project: set EXPO_PUBLIC_SUPABASE_URL in .env.local first (see .env.example)." >&2
  exit 1
fi

supabase_token=${SUPABASE_ACCESS_TOKEN:-}
[[ -n "$supabase_token" ]] || { read -rsp 'Supabase access token (starts with sbp_): ' supabase_token && echo; }
# The prompt hides what's typed, so an empty paste or the token's name (which
# can have spaces) is easy to miss; Supabase only answers "Format is
# Authorization: Bearer [token]".
if [[ ! "$supabase_token" =~ ^sbp_[^[:space:]]+$ ]]; then
  echo "That isn't an access token: paste the token itself, which starts with sbp_ (not its name)." >&2
  echo "Supabase shows it only once, so make a new one at supabase.com/dashboard/account/tokens if needed." >&2
  exit 1
fi

# curl that prints the server's answer and stops when it says no.
call() {
  local out
  if ! out=$(curl -sS --fail-with-body "$@"); then
    printf '%s\n' "$out" >&2
    return 1
  fi
  printf '%s' "$out"
}
# The token goes to curl as a config file, not an argument.
supabase() { call -K <(printf 'header = "Authorization: Bearer %s"\n' "$supabase_token") "$@"; }

until=$(date -u -v+"${days}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+$days days" +%Y-%m-%dT%H:%M:%SZ)
config="https://api.supabase.com/v1/projects/$ref/config/auth"

echo "Adding test number +$phone to Supabase project ${ref}…"
# Read first, so nothing is changed if Supabase says no.
current=$(supabase "$config")
printf '%s' "$current" |
  jq --arg phone "$phone" --arg code "$code" --arg until "$until" '{
    sms_test_otp: ([(.sms_test_otp // "") | split(",")[] | select(. != "" and (startswith($phone + "=") | not))]
      + ["\($phone)=\($code)"] | join(",")),
    sms_test_otp_valid_until: $until
  }' |
  supabase -X PATCH "$config" -H 'Content-Type: application/json' --data-binary @- >/dev/null

saved=$(supabase "$config" | jq -r --arg phone "$phone" '.sms_test_otp // "" | split(",")[] | select(startswith($phone + "=")) | ltrimstr($phone + "=")')
if [[ "$saved" != "$code" ]]; then
  echo "Supabase didn't keep the test number. Check Authentication › Sign In / Providers › Phone." >&2
  exit 1
fi
echo
echo "Done. Log in with +$phone and the code $code (no text is sent) until $until."
