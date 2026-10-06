# EquastarJS

## Research

### Auth

`POST /api/auth` with JSON body: `username`, `password` and `ip` (is `ip` required? idk)

returns JSON object with `auth.idToken` a JWT, passwed to requests with a Bearer Authorization header.
and `data.RESULT.0.IDUSER` (corresponds to `userId`)
Each response returns a new jwt in `auth.idToken`, that has 20mins of expiration. might need to use the new one each time.

## Metadata

getting required `persId` and `etbId`: `POST /api/post` with `nom=getEtablissement` and `data.userId`

## Timetables

`POST /api/post` with JSON body: `nom=getPlanningPersonne`, `data` object with `etbId`, `userId`, `dtDeb` (start date), `nbJours` (nb of days to request), `persId`

returns JSON object with `data.RESULT.*` values:

- **tpausesoir:** 0 (start time for evening shift, in minutes count)
- **absMidi:** (filled with explanation if absent at shift. ECO = school, RH = ooo)
- **hdebsoir:** 0 (end time evening, in minutes count)
- **cmtJour:** ""
- **absLongSoir:** ""
- **plgSoir:** ""
- **IdServiceMidi:** (integer)
- **hfinsoir:** 0
- **etbNom:** (string, name of workplace)
- **tplgsoir:** 0
- **serviceSoir:** (string, uninteresting i think)
- **colorSoir:** "65535" (might be the decimal repr of a hex color code, its #FFFF here)
- **cmtMidi:** ""
- **hdebmidi:** 690 (start time noon, in mintes count (690 mins = 11:30))
- **tpausemidi:** -50 (in minutes, opposite sign (why lmao))
- **dtplglng:** "Lundi 5 Octobre" (datestring)
- **absSoir:** ""
- **IdServiceSoir:** 4
- **hfinmidi:** 1080 (end time noon, in minutes count)
- **colorMidi:** "16777215" (same, decimal repr of hex. its #FFFFFF here? hmmm)
- **dtplg:** "05/10/2026" (dd/MM/yyyy of day)
- **tplgmidi:** 340 (total minutes, accounting for break time)
- **plgMidi:** "11.30 - 18.00 (-50#C1#)" ("start - end (break#C1#)", idk what the #C1# is, its always this string exactly)
- **absLongMidi:** ""
- **cmtSoir:** ""
- **serviceMidi:** (string uninteresting also)

Useful stuff:

- Event start & end:
  - `h{deb,fin}{midi,soir}` in minute counts
  - `dtplg` in dd/MM/yyyy
- Event title: `etbNom` ?
