import Link from "next/link";
import {
  getSeasonYears,
  getChampion,
  getDivisionChampions,
  getTickerItems,
  type StandingsRow,
} from "@/lib/queries";
import NewsTicker from "@/components/NewsTicker";

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

function formatRecord(team: { wins: number; losses: number; ties: number }): string {
  return `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ""}`;
}

function HangingBanner({
  colorClass,
  titleLine,
  teamName,
  owner,
  record,
  year,
}: {
  colorClass: string;
  titleLine: string;
  teamName: string;
  owner: string;
  record: string;
  year: number;
}) {
  return (
    <div className="relative w-72">
      <div className="relative h-8">
        <span className="absolute left-7 top-0 h-8 w-px bg-[var(--color-ink)]" />
        <span className="absolute right-7 top-0 h-8 w-px bg-[var(--color-ink)]" />
      </div>
      <div className={`banner-flag ${colorClass} min-h-[27rem]`}>
        <div className="banner-rod" />
        <div className="banner-body px-5 py-6 text-center">
          <p className="font-display text-2xl leading-snug tracking-wide uppercase text-[var(--color-gold)]">
            {titleLine}
          </p>
          <div className="h-px bg-[rgba(242,232,201,0.3)] my-3 mx-8" />
          <p className="font-display text-3xl leading-snug text-[var(--color-cream)] break-words">
            {teamName}
          </p>
          <p className="font-body text-2xl font-bold text-[var(--color-cream)] mt-3 break-words">
            {owner}
          </p>
          <p className="font-body text-xl font-semibold text-[var(--color-cream)] mt-2">
            {record}
          </p>
          <p className="font-display text-4xl leading-none text-[var(--color-gold)] mt-4">{year}</p>
        </div>
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
            titleLine="League Champions"
            teamName={champion.team_name ?? champion.manager_name}
            owner={champion.manager_name}
            record={formatRecord(champion)}
            year={year}
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
            titleLine={`${team.division ?? ""} Division Champions`}
            teamName={team.team_name ?? team.manager_name}
            owner={team.manager_name}
            record={formatRecord(team)}
            year={year}
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

  const [seasons, tickerItems] = await Promise.all([
    Promise.all(
      years.map(async (year) => {
        const [champion, divisionChamps] = await Promise.all([
          getChampion(year),
          getDivisionChampions(year),
        ]);
        return { year, champion, divisionChamps };
      })
    ),
    getTickerItems(),
  ]);

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
      <p className="font-body font-semibold text-center opacity-70 mb-6">
        League standings, matchup history, and every champion since kickoff.
      </p>

      <NewsTicker items={tickerItems} />

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
