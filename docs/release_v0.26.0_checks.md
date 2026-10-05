# School mission release checks

- Game 0.26.0 build26; editor remains 1.14.0.
- school_quest_test.cjs PASS: 07:30 start, actual 5 real seconds per game minute, >=40px top clock, Emily following, map pause, active save/resume, strict 08:00 deadline and retry, early delivery, completion persistence, non-Andrei adventure.
- smoke_test.cjs and screen_navigation_test.cjs PASS: existing game/save/quest flow and touch/pinch takeover regression.
- Clock preview docs/school_clock_v26.png visually inspected at phone size; HUD avoids the large mission panel.
- Final release build and lint PASS; original signing certificate SHA256 daf5c82aecc50b8c76ffe097790dad5812527fa711cc2598fd55343ee0babb78 verified.
- Android emulator install -r PASS; launcher activity opened; versionCode26/versionName0.26.0 confirmed. Physical-phone mission behavior remains unverified.
- New save fields: daySeconds and schoolQuest(status, bounded trail, optional completedAt). Old unfinished Andrei saves begin the mission at 07:30; already won saves treat it as completed. Existing position, map edits, markers and rewards retained.
- Future Andrei-specific missions beyond this first school run have not yet been specified; the existing marker route follows delivery.
