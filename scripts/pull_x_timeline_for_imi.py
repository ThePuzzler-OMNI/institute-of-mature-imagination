#!/usr/bin/env python3
"""
Pull @omni_puzzler (or OMNI_MIRROR_X_HANDLE) timeline using Azure App Service X env,
write JSON for IMI best-of curation. Never prints secret values.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "x_timeline_omni_puzzler.json"
HANDLE = (os.environ.get("OMNI_MIRROR_X_HANDLE") or "omni_puzzler").lstrip("@")


def load_azure_settings() -> dict[str, str]:
    """Pull App Settings from Azure CLI (values stay local to process)."""
    cmd = [
        "az",
        "webapp",
        "config",
        "appsettings",
        "list",
        "-g",
        "rg-omni-chat",
        "-n",
        "onemission-omni-chat",
        "-o",
        "json",
    ]
    raw = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
    rows = json.loads(raw)
    return {r["name"]: r.get("value") or "" for r in rows if r.get("name")}


def oauth1_get(url: str, ck: str, cs: str, at: str, ats: str):
    method = "GET"
    parsed = urllib.parse.urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    oauth = {
        "oauth_consumer_key": ck,
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": at,
        "oauth_version": "1.0",
    }
    params = {**query, **oauth}
    param_str = "&".join(
        f"{urllib.parse.quote(str(k), safe='~')}={urllib.parse.quote(str(v), safe='~')}"
        for k, v in sorted(params.items())
    )
    base = "&".join(
        [
            method,
            urllib.parse.quote(base_url, safe="~"),
            urllib.parse.quote(param_str, safe="~"),
        ]
    )
    signing_key = f"{urllib.parse.quote(cs, safe='~')}&{urllib.parse.quote(ats, safe='~')}"
    sig = base64.b64encode(
        hmac.new(signing_key.encode(), base.encode(), hashlib.sha1).digest()
    ).decode()
    oauth["oauth_signature"] = sig
    auth = "OAuth " + ", ".join(
        f'{urllib.parse.quote(k, safe="~")}="{urllib.parse.quote(v, safe="~")}"'
        for k, v in sorted(oauth.items())
    )
    req = urllib.request.Request(
        url, headers={"Authorization": auth, "User-Agent": "OMNI-IMI-Timeline/1"}
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:800]
        return e.code, {"error": body}


def bearer_get(url: str, token: str):
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "OMNI-IMI-Timeline/1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:800]
        return e.code, {"error": body}


def paginate_tweets(uid: str, auth_mode: str, **kw) -> tuple[list, list[str]]:
    """Return (rows, errors)."""
    rows: list = []
    errors: list[str] = []
    next_token = None
    max_pages = int(os.environ.get("OMNI_MIRROR_X_MAX_PAGES") or "15")
    page_size = min(int(os.environ.get("OMNI_MIRROR_X_MAX_RESULTS") or "100"), 100)
    host = "https://api.x.com"
    for page in range(max_pages):
        q = (
            f"max_results={page_size}"
            f"&tweet.fields=created_at,text,public_metrics,entities,attachments,note_tweet"
            f"&expansions=attachments.media_keys"
            f"&media.fields=type,url,preview_image_url"
            f"&exclude=retweets"
        )
        if next_token:
            q += f"&pagination_token={urllib.parse.quote(next_token)}"
        url = f"{host}/2/users/{uid}/tweets?{q}"
        if auth_mode == "oauth1":
            code, data = oauth1_get(url, kw["ck"], kw["cs"], kw["at"], kw["ats"])
        else:
            code, data = bearer_get(url, kw["token"])
        if code != 200:
            errors.append(f"page{page} status={code} {str(data)[:200]}")
            break
        batch = data.get("data") or []
        if isinstance(batch, list):
            rows.extend(batch)
        meta = data.get("meta") or {}
        next_token = meta.get("next_token")
        print(f"  page {page+1}: +{len(batch)} total={len(rows)} next={bool(next_token)}")
        if not next_token or not batch:
            break
        time.sleep(0.4)
    return rows, errors


def main() -> int:
    print("Loading Azure app settings (values not printed)…")
    try:
        settings = load_azure_settings()
    except Exception as e:
        print("Azure CLI failed:", e)
        print("Falling back to process env only.")
        settings = {}

    def g(name: str) -> str:
        return (settings.get(name) or os.environ.get(name) or "").strip()

    ck, cs = g("X_API_KEY"), g("X_API_SECRET")
    at, ats = g("X_ACCESS_TOKEN"), g("X_ACCESS_TOKEN_SECRET")
    bearer = g("X_BEARER_TOKEN")
    o2 = g("X_OAUTH2_ACCESS_TOKEN")
    handle = (g("OMNI_MIRROR_X_HANDLE") or HANDLE).lstrip("@")

    print("handle", handle)
    print("has oauth1", bool(ck and cs and at and ats))
    print("has bearer", bool(bearer))
    print("has oauth2", bool(o2))

    uid = None
    uname = handle
    auth_used = None
    rows: list = []
    errors: list[str] = []

    # 1) OAuth1 user context
    if ck and cs and at and ats:
        print("\n=== OAuth1 users/me ===")
        code, me = oauth1_get(
            "https://api.x.com/2/users/me?user.fields=username,public_metrics",
            ck,
            cs,
            at,
            ats,
        )
        print("status", code)
        if code == 200:
            uid = (me.get("data") or {}).get("id")
            uname = (me.get("data") or {}).get("username") or handle
            print("username", uname, "id", uid)
            print("=== OAuth1 user tweets (paginate) ===")
            rows, errs = paginate_tweets(
                uid, "oauth1", ck=ck, cs=cs, at=at, ats=ats
            )
            errors.extend(errs)
            if rows:
                auth_used = "oauth1_user"
        else:
            errors.append(f"oauth1 me: {code}")

    # 2) Bearer by username + tweets
    if not rows and bearer:
        print("\n=== Bearer by username ===")
        code, u = bearer_get(
            f"https://api.x.com/2/users/by/username/{handle}?user.fields=username,public_metrics",
            bearer,
        )
        print("status", code)
        if code == 200:
            uid = (u.get("data") or {}).get("id")
            uname = (u.get("data") or {}).get("username") or handle
            print("username", uname, "id", uid)
            print("=== Bearer user tweets ===")
            rows, errs = paginate_tweets(uid, "bearer", token=bearer)
            errors.extend(errs)
            if rows:
                auth_used = "bearer"
        else:
            errors.append(f"bearer lookup: {code} {str(u)[:200]}")

    # 3) OAuth2 user token
    if not rows and o2:
        print("\n=== OAuth2 users/me ===")
        code, me = bearer_get(
            "https://api.x.com/2/users/me?user.fields=username", o2
        )
        print("status", code)
        if code == 200:
            uid = (me.get("data") or {}).get("id")
            uname = (me.get("data") or {}).get("username") or handle
            rows, errs = paginate_tweets(uid, "bearer", token=o2)
            errors.extend(errs)
            if rows:
                auth_used = "oauth2_user"

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "pulled_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "handle": uname,
        "user_id": uid,
        "auth": auth_used,
        "tweet_count": len(rows),
        "errors": errors,
        "tweets": [
            {
                "id": t.get("id"),
                "created_at": t.get("created_at"),
                "text": t.get("text") or (t.get("note_tweet") or {}).get("text") or "",
                "metrics": t.get("public_metrics") or {},
                "url": f"https://x.com/{uname}/status/{t.get('id')}",
            }
            for t in rows
            if t.get("id")
        ],
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT} count={len(rows)} auth={auth_used}")
    if errors:
        print("errors:", errors[:5])
    # preview
    for t in payload["tweets"][:8]:
        print("-", t["created_at"][:10] if t.get("created_at") else "?", (t.get("text") or "")[:90].replace("\n", " "))
    return 0 if rows else 1


if __name__ == "__main__":
    sys.exit(main())
