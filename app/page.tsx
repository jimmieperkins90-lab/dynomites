import Link from "next/link";
import {
  getSeasonYears,
  getChampion,
  getDivisionChampions,
  type StandingsRow,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function ChampionsRafter({
  champions,
}: {
  champions: { year: number; champion: StandingsRow }[];
}) {
  if (champions.length === 0) return null;

  return (
    <div className="relative mb-14 pt-4">
      <div
        className="absolute left-[5%] right-[5%] top-0 h-3.5 rounded-sm border-2 border-[var(--color-ink)]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #6b4a2b, #6b4a2b 18px, #5c3f24 18px, #5c3f24 22px)",
        }}
      />
      <div className="flex flex-wrap justify-center gap-8 pt-7">
        {champions.map(({ year, champion }) => (
          <div key={year} className="relative w-56 pt-7">
            <span className="absolute left-6 top-0 h-7 w-0.5 bg-[var(--color-ink)]" />
            <span className="absolute right-6 top-0 h-7 w-0.5 bg-[var(--color-ink)]" />
            <div className="ribbon px-4 py-3 text-center">
              <p className="font-display text-2xl leading-none">{year}</p>
              <p className="font-body font-extrabold text-xs uppercase tracking-wide text-[var(--color-rust)] mt-1">
                {champion.team_name ?? champion.manager_name}
              </p>
              <p className="font-body text-xs opacity-60 mt-1">
                {champion.manager_name} · {champion.wins}-{champion.losses}
                {champion.ties > 0 ? `-${champion.ties}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DivisionBanners({ divisions, year }: { divisions: StandingsRow[]; year: number }) {
  return (
    <div className="mb-10">
      <p className="font-body font-extrabold text-xs uppercase tracking-widest text-center text-[var(--color-green-deep)] mb-3">
        {year} Division Champions
      </p>
      <div className={`grid gap-4 ${divisions.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {divisions.map((team) => (
          <div key={team.team_season_id} className="panel px-5 py-4 text-center">
            <p className="font-body font-extrabold text-xs uppercase tracking-widest text-[var(--color-rust)] mb-1">
              {team.division}
            </p>
            <p className="font-display text-xl">{team.team_name ?? team.manager_name}</p>
            <p className="font-body text-xs opacity-60">{team.manager_name}</p>
            <p className="font-body text-xs opacity-50 mt-1">
              {team.wins}-{team.losses}
              {team.ties > 0 ? `-${team.ties}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type SeasonData = {
  year: number;
  champion: StandingsRow | null;
  divisionChamps: StandingsRow[];
};

function SeasonSection({ season, isFirst }: { season: SeasonData; isFirst: boolean }) {
  if (season.divisionChamps.length === 0) return null;

  return (
    <section className={isFirst ? "" : "mt-12 pt-10 border-t-2 border-[var(--color-ink)]/15"}>
      <DivisionBanners divisions={season.divisionChamps} year={season.year} />
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
        <h1 className="outline font-display text-5xl tracking-wide mb-4">Dyno Mites</h1>
        <p className="font-body opacity-70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  const seasons: SeasonData[] = await Promise.all(
    years.map(async (year) => {
      const [champion, divisionChamps] = await Promise.all([
        getChampion(year),
        getDivisionChampions(year),
      ]);
      return { year, champion, divisionChamps };
    })
  );

  const champions = seasons
    .filter((s): s is SeasonData & { champion: StandingsRow } => s.champion !== null)
    .map((s) => ({ year: s.year, champion: s.champion }));

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-5xl tracking-wide text-center mb-2">Dyno Mites</h1>
      <p className="font-body font-semibold text-center opacity-70 mb-2">
        League standings, matchup history, and every champion since kickoff.
      </p>

      <ChampionsRafter champions={champions} />

      {seasons.map((season, i) => (
        <SeasonSection key={season.year} season={season} isFirst={i === 0} />
      ))}

      <div className="grid sm:grid-cols-2 gap-4 mt-12">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="panel hover:border-[var(--color-rust)] transition-colors px-5 py-4 text-center"
          >
            <span className="font-display text-lg tracking-wide">{link.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
