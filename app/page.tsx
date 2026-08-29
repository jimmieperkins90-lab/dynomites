import Link from "next/link";
import {
  getSeasonYears,
  getChampion,
  getDivisionChampions,
  type StandingsRow,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function HangingBanner({
  variant,
  eyebrow,
  title,
  subtitle,
}: {
  variant: "champion" | "division";
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative w-40">
      <div className="relative h-10">
        <span className="absolute left-3.5 top-0 h-8 w-0.5 bg-[var(--color-ink)]" />
        <span className="absolute right-3.5 top-0 h-8 w-0.5 bg-[var(--color-ink)]" />
        <div className="banner-pole absolute bottom-0 left-0.5 right-0.5 h-2" />
      </div>
      <div
        className={`banner-flag ${
          variant === "division" ? "banner-flag-rust" : ""
        } px-3 py-5 text-center`}
      >
        <p className="font-display text-xl leading-none text-[var(--color-gold)]">{eyebrow}</p>
        <p className="font-body font-extrabold text-xs text-[var(--color-cream)] mt-2">{title}</p>
        <p className="font-body text-[0.65rem] font-semibold text-[var(--color-cream)]/60 mt-1">
          {subtitle}
        </p>
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
    <div className="relative mb-16 pt-4">
      <div className="rafter-beam absolute left-[5%] right-[5%] top-0 h-4 rounded-sm border-2 border-[var(--color-ink)]" />
      <div className="flex flex-wrap justify-center gap-10 pt-9">
        {champions.map(({ year, champion }) => (
          <HangingBanner
            key={year}
            variant="champion"
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

function DivisionBanners({ divisions, year }: { divisions: StandingsRow[]; year: number }) {
  return (
    <div className="relative mb-10 pt-4">
      <p className="font-body font-extrabold text-xs uppercase tracking-widest text-center text-[var(--color-green-deep)] mb-4">
        {year} Division Champions
      </p>
      <div className="rafter-beam absolute left-[15%] right-[15%] top-8 h-3 rounded-sm border-2 border-[var(--color-ink)]" />
      <div className="flex flex-wrap justify-center gap-8 pt-7">
        {divisions.map((team) => (
          <HangingBanner
            key={team.team_season_id}
            variant="division"
            eyebrow={team.division ?? ""}
            title={team.team_name ?? team.manager_name}
            subtitle={`${team.manager_name} · ${team.wins}-${team.losses}${
              team.ties > 0 ? `-${team.ties}` : ""
            }`}
          />
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
  const playedDivisionChamps = season.divisionChamps.filter(
    (team) => team.wins + team.losses + team.ties > 0
  );
  if (playedDivisionChamps.length === 0) return null;

  return (
    <section className={isFirst ? "" : "mt-12 pt-10 border-t-2 border-[var(--color-ink)]/15"}>
      <DivisionBanners divisions={playedDivisionChamps} year={season.year} />
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
    .filter(
      (s): s is SeasonData & { champion: StandingsRow } =>
        s.champion !== null && s.champion.wins + s.champion.losses + s.champion.ties > 0
    )
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
