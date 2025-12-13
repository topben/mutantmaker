import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import Hero from "../components/Hero.tsx";
import MutantMaker from "../islands/MutantMaker.tsx";

interface HomeProps {
  apeContractAddress: string;
  receivingWallet: string;
  paymentAmount: string;
}

export default function Home({ data }: PageProps<HomeProps>) {
  return (
    <>
      <Head>
        <title>Mutant Maker - Turn Your Photo into a Mutant Ape | AI PFP Generator</title>

        {/* Standard SEO */}
        <meta name="description" content="Fuse your photo with Mutant Ape Yacht Club style art using Google Gemini AI. Create unique, melting, psychedelic anime profile pictures instantly on ApeChain." />
        <meta name="keywords" content="Mutant Ape, MAYC, BAYC, AI Art Generator, PFP Maker, Anime Avatar, ApeChain, NFT Tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Social Media / Open Graph (Facebook, Discord, LinkedIn) */}
        <meta property="og:title" content="Mutant Maker Lab - Fuse Your DNA" />
        <meta property="og:description" content="Generate psychedelic Mutant Ape PFPs with AI. Join the lab and mutate your profile picture now." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mutantmaker.deno.dev/" />
        <meta property="og:image" content="https://mutantmaker.deno.dev/mutant.avif" />

        {/* Twitter / X Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mutant Maker - AI PFP Lab" />
        <meta name="twitter:description" content="Fuse your photos with Mutant Ape style. Powered by Gemini AI on ApeChain." />
        <meta name="twitter:image" content="https://mutantmaker.deno.dev/mutant.avif" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://mutantmaker.deno.dev/" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Styling */}
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Space+Grotesk:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div class="min-h-screen pb-20 overflow-x-hidden">
        {/* Background Noise Texture */}
        <div
          class="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        ></div>

        <div class="w-full max-w-7xl mx-auto p-4 md:p-8 relative z-10">
          <Hero />
          <MutantMaker
            apeContractAddress={data.apeContractAddress}
            receivingWallet={data.receivingWallet}
            paymentAmount={data.paymentAmount}
          />

          {/* Footer info */}
          <div class="mt-16 text-center pb-8">
            <p class="text-slate-600 font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase">
              Powered by Google Gemini // Neural Mutagen Engine v2.5 // Running on Deno Fresh 🦕
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export const handler = {
  GET(_req: Request, ctx: any) {
    // Load environment variables and pass to the component
    // Default to "native" since APE is the native coin on ApeChain (like ETH on Ethereum)
    const data: HomeProps = {
      apeContractAddress: Deno.env.get("APE_COIN_CONTRACT_ADDRESS") || "native",
      receivingWallet: Deno.env.get("RECEIVING_WALLET_ADDRESS") || "",
      paymentAmount: Deno.env.get("APE_PAYMENT_AMOUNT") || "0.1",
    };

    return ctx.render(data);
  },
};
