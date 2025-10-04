<!-- src/pages/Home.vue -->
<template>
    <main>
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                About EvoNext
            </h1>

            <div class="flex items-center gap-4 bg-slate-800 p-2 rounded-lg">
                <span class="w-[300px]">
                    <span class="text-sky-100 text-lg font-mono px-2 tracking-wider">
                        BetaTesterExtraordinaire
                    </span>

                    <span class="text-sky-300/70 text-xs font-mono px-2 tracking-tighter">
                        v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5
                    </span>
                </span>

                <button class="p-2 rounded-md hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <section class="bg-slate-900 font-sans text-slate-200">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
                <div class="flex flex-col items-center gap-12">

                    <!-- Main Heading and Intro -->
                    <div class="text-center space-y-6">
                        <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                            Share Your Truth.
                        </h1>
                        <p class="text-lg leading-relaxed text-slate-400">
                            We asked a simple question: What if you had a space where you could be your most authentic self? A place free from judgment, censorship, and the fear of being silenced?
                        </p>
                        <p class="text-lg leading-relaxed text-slate-400">
                            From that question, EvoNext was born.
                        </p>
                    </div>

                    <!-- Mission Section -->
                    <div class="w-full text-center">
                        <h2 class="text-3xl font-bold tracking-tight text-white">
                            Free Your Inhibitions ⛓️‍💥
                        </h2>
                        <p class="mt-4 text-lg leading-relaxed text-slate-400">
                            EvoNext is more than just an application; it's a movement. We are a decentralized social space dedicated to empowering individual expression. Our mission is to provide safe and enjoyable environments where you can confidently explore ideas, curate your digital world, and share your truth with unwavering courage.
                        </p>
                    </div>

                    <!-- Core Pillars Section -->
                    <div class="w-full">
                        <h3 class="text-2xl font-bold text-center text-cyan-400">
                            Discover. Curate. Share.
                        </h3>
                        <p class="mt-4 text-center text-lg leading-relaxed text-slate-400">
                            At the heart of the EvoNext experience are three core pillars:
                        </p>
                        <ul class="mt-8 space-y-8">
                            <li>
                                <strong class="block text-xl font-semibold text-slate-100">Discover Safe Spaces:</strong>
                                <span class="block mt-1 text-slate-400">Dive into a universe of communities and content. Find your niche, connect with like-minded individuals, and engage in conversations that matter, all within environments built on respect and safety.</span>
                            </li>
                            <li>
                                <strong class="block text-xl font-semibold text-slate-100">Curate Your World:</strong>
                                <span class="block mt-1 text-slate-400">You are the editor of your experience. Gather, organize, and showcase the content that inspires you. Build a profile and a presence that is a true reflection of your identity and passions.</span>
                            </li>
                            <li>
                                <strong class="block text-xl font-semibold text-slate-100">Share YOUR Truth Fearlessly ✊:</strong>
                                <span class="block mt-1 text-slate-400">This is your stage. Whether it's a fleeting thought, a deep conviction, or a creative masterpiece, your voice is paramount. On EvoNext, you are encouraged to speak, create, and engage, knowing your expression is protected.</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Technology Section -->
                    <div class="w-full">
                        <h3 class="text-2xl font-bold text-center text-cyan-400">
                            Secured by Dash Platform v2 🛡️
                        </h3>
                        <p class="mt-4 text-center text-lg leading-relaxed text-slate-400">
                            Our commitment to your freedom and security is absolute. That's why EvoNext is built on the groundbreaking <strong>Dash Platform v2</strong>. This decentralized foundation means:
                        </p>
                        <ul class="mt-8 space-y-4 text-center">
                            <li class="font-medium text-slate-300"><strong class="text-white">You Own Your Data:</strong> No central authority controls your account or your content.</li>
                            <li class="font-medium text-slate-300"><strong class="text-white">Censorship-Resistant:</strong> Your voice cannot be arbitrarily silenced.</li>
                            <li class="font-medium text-slate-300"><strong class="text-white">Unyielding Security:</strong> Your digital presence is protected by a shield of advanced cryptographic security.</li>
                        </ul>
                    </div>

                    <!-- Call to Action -->
                    <div class="text-center mt-8">
                        <p class="text-xl font-medium text-white">
                            Join us on EvoNext, and take the next step in your evolution.
                        </p>
                    </div>

                </div>
            </div>
        </section>

    </main>
</template>
