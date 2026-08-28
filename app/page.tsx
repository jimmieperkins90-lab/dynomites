import Link from "next/link";
import {
  getSeasonYears,
  getChampion,
  getDivisionChampions,
  type StandingsRow,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function ChampionBanner({ champion, year }: { champion: StandingsRow; year: number }) {
  return (
    <div className="fossil-card bg-basalt border-2 border-fuse px-6 py-8 text-center mb-8">
      <p className="font-mono text-xs text-fuse uppercase tracking-widest mb-2">
        {year} League Champion
      </p>
      <p className="font-display text-4xl text-fuse tracking-wide">
        🏆 {champion.team_name ?? champion.manager_name}
      </p>
      <p className="font-mono text-sm text-bone/60 mt-1">{champion.manager_name}</p>
      <p className="font-mono text-xs text-bone/50 mt-2">
        {champion.wins}-{champion.losses}
        {champion.ties > 0 ? `-${champion.ties}` : ""} · {champion.points_for?.toFixed(1)} PF
      </p>
    </div>
  );
}

function DivisionBanners({ divisions, year }: { divisions: StandingsRow[]; year: number }) {
  return (
    <div className="mb-10">
      <p className="font-mono text-xs text-olive uppercase tracking-widest mb-3 text-center">
        {year} Division Champions
      </p>
      <div className={`grid gap-4 ${divisions.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {divisions.map((team) => (
          <div
            key={team.team_season_id}
            className="fossil-card bg-basalt border border-amber/50 px-5 py-4 text-center"
          >
            <p className="font-mono text-xs text-amber uppercase tracking-widest mb-1">
              {team.division}
            </p>
            <p className="font-display text-xl text-bone">{team.team_name ?? team.manager_name}</p>
            <p className="font-mono text-xs text-bone/50">{team.manager_name}</p>
            <p className="font-mono text-xs text-bone/40 mt-1">
              {team.wins}-{team.losses}
              {team.ties > 0 ? `-${team.ties}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

async function SeasonSection({ year, isFirst }: { year: number; isFirst: boolean }) {
  const [champion, divisionChamps] = await Promise.all([
    getChampion(year),
    getDivisionChampions(year),
  ]);

  return (
    <section className={isFirst ? "" : "mt-12 pt-10 border-t border-olive/20"}>
      {champion ? (
        <ChampionBanner champion={champion} year={year} />
      ) : (
        <p className="font-body text-bone/50 text-center mb-8">
          {year} season is still underway — no champion crowned yet.
        </p>
      )}

      {divisionChamps.length > 0 && (
        <DivisionBanners divisions={divisionChamps} year={year} />
      )}
    </section>
  );
}

const QUICK_LINKS = [
  { href: "/standings", label: "Standings" },
  { href: "/games", label: "Games" },
  { href: "/history", label: "History" },
  { href: "/articles", label: "Articles" },
  { href: "/valuations", label: "Valuations" },
];

export default async function LandingPage() {
  const years = await getSeasonYears();

  if (years.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 text-center">
        <h1 className="font-display text-5xl text-bone tracking-wide mb-4">Dyno Mites</h1>
        <p className="font-body text-bone/70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-5xl text-bone tracking-wide text-center mb-10">
        Dyno Mites
      </h1>

      {years.map((year, i) => (
        <SeasonSection key={year} year={year} isFirst={i === 0} />
      ))}

      <div className="grid sm:grid-cols-2 gap-4 mt-12">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="fossil-card bg-basalt border border-olive/30 hover:border-amber/60 transition-colors px-5 py-4 text-center"
          >
            <span className="font-display text-lg text-bone tracking-wide">{link.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
