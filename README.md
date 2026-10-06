# EquastarJS

## Research

- auth: `POST /api/auth` with JSON body: `username`, `password` and `ip` (is `ip` required? idk)
  returns JSON object with `auth.idToken` a JWT, passwed to requests with a Bearer Authorization header
  and `data.RESULT.0.IDUSER` (corresponds to `userId`)
- planning: `POST /api/post` with JSON body: `nom=getPlanningPersonne`, `data` object with `etbId`, `userId`, `dtDeb` (start date), `nbJours` (nb of days to request), `persId`
  returns JSON object with `data.RESULT.*` values:
  ```yaml
    tpausesoir: 0 (start time evening, in minutes count)
    absMidi: ""
    hdebsoir: 0 (end time evening, in minutes count)
    cmtJour: ""
    absLongSoir: ""
    plgSoir: ""
    IdServiceMidi: (integer)
    hfinsoir: 0
    etbNom: (string, name of workplace)
    tplgsoir: 0
    serviceSoir: (string, uninteresting i think)
    colorSoir: "65535" (might be the decimal repr of a hex color code, its #FFFF here)
    cmtMidi: ""
    hdebmidi: 690 (start time noon, in mintes count (690 mins = 11:30))
    tpausemidi: -50 (in minutes, opposite sign (why lmao))
    dtplglng: "Lundi 5 Octobre" (datestring)
    absSoir: ""
    IdServiceSoir: 4
    hfinmidi: 1080 (end time noon, in minutes count)
    colorMidi: "16777215" (same, decimal repr of hex. its #FFFFFF here? hmmm)
    dtplg: "05/10/2026" (dd/MM/yyy of day)
    tplgmidi: 340 (total minutes, accounting for break time)
    plgMidi: "11.30 - 18.00 (-50#C1#)" ("start - end (break#C1#)", idk what the #C1# is)
    absLongMidi: ""
    cmtSoir: ""
    serviceMidi: (string uninteresting also)
  ```

