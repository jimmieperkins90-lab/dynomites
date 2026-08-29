import Link from "next/link";
import {
  getSeasonYears,
  getChampion,
  getDivisionChampions,
  type StandingsRow,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function divisionColorClass(division: string | null): string {
  switch (division) {
    case "Carnies":
      return "banner-flag-rust";
    case "Herbies":
      return "banner-flag-herbies";
    case "Omnies":
      return "banner-flag-omnies";
    default:
      return "banner-flag-rust";
  }
}

function HangingBanner({
  colorClass,
  eyebrow,
  title,
  subtitle,
}: {
  colorClass: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative w-64">
      <div className="relative h-16">
        <span className="absolute left-6 top-0 h-12 w-0.5 bg-[var(--color-ink)]" />
        <span className="absolute right-6 top-0 h-12 w-0.5 bg-[var(--color-ink)]" />
        <div className="banner-pole absolute bottom-0 left-0.5 right-0.5 h-4" />
      </div>
      <div className={`banner-flag ${colorClass} h-72 px-4 pt-8 pb-16 text-center`}>
        <p className="font-display text-4xl leading-none text-[var(--color-gold)]">{eyebrow}</p>
        <p className="font-display text-xl leading-tight text-[var(--color-cream)] mt-3 truncate px-1">
          {title}
        </p>
        <p className="font-body text-sm font-bold text-[var(--color-cream)]/80 mt-2">{subtitle}</p>
      </div>
    </div>
  );
}

function ChampionsRafter({
  champions,
}: {
  champions: { year: number; champion: StandingsRow }[];
}) {
  if (champions.length === 0) return null;

  return (
    <div className="relative mb-20 pt-6">
      <div className="rafter-beam absolute left-[5%] right-[5%] top-0 h-5 rounded-sm border-2 border-[var(--color-ink)]" />
      <div className="flex flex-wrap justify-center gap-12 pt-8">
        {champions.map(({ year, champion }) => (
          <HangingBanner
            key={year}
            colorClass="banner-flag-champion"
            eyebrow={String(year)}
            title={champion.team_name ?? champion.manager_name}
            subtitle={`${champion.manager_name} · ${champion.wins}-${champion.losses}${
              champion.ties > 0 ? `-${champion.ties}` : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type DivisionChampionEntry = { year: number; team: StandingsRow };

function DivisionChampionsRafter({ entries }: { entries: DivisionChampionEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="relative mb-12 pt-6">
      <div className="rafter-beam absolute left-[10%] right-[10%] top-0 h-4 rounded-sm border-2 border-[var(--color-ink)]" />
      <div className="flex flex-wrap justify-center gap-10 pt-8">
        {entries.map(({ year, team }) => (
          <HangingBanner
            key={team.team_season_id}
            colorClass={divisionColorClass(team.division)}
            eyebrow={team.division ?? ""}
            title={team.team_name ?? team.manager_name}
            subtitle={`${team.manager_name} · ${year} · ${team.wins}-${team.losses}${
              team.ties > 0 ? `-${team.ties}` : ""
            }`}
          />
        ))}
      </div>
    </div>
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
      <main className="max-w-4xl mx-auto px-4 py-10 text-center">
        <h1 className="outline font-display text-5xl tracking-wide mb-4">Dyno Mites</h1>
        <p className="font-body opacity-70">
          No seasons found. Check that the site is connected to Supabase and a sync has run.
        </p>
      </main>
    );
  }

  const seasons = await Promise.all(
    years.map(async (year) => {
      const [champion, divisionChamps] = await Promise.all([
        getChampion(year),
        getDivisionChampions(year),
      ]);
      return { year, champion, divisionChamps };
    })
  );

  const champions = seasons
    .filter(
      (s): s is typeof s & { champion: StandingsRow } =>
        s.champion !== null && s.champion.wins + s.champion.losses + s.champion.ties > 0
    )
    .map((s) => ({ year: s.year, champion: s.champion }));

  const divisionEntries: DivisionChampionEntry[] = seasons.flatMap((s) =>
    s.divisionChamps
      .filter((team) => team.wins + team.losses + team.ties > 0)
      .map((team) => ({ year: s.year, team }))
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="outline font-display text-5xl tracking-wide text-center mb-2">Dyno Mites</h1>
      <p className="font-body font-semibold text-center opacity-70 mb-2">
        League standings, matchup history, and every champion since kickoff.
      </p>

      <ChampionsRafter champions={champions} />
      <DivisionChampionsRafter entries={divisionEntries} />

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
