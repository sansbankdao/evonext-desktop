<!-- src/screens/About.vue -->
<template>
    <main>
        <Header title="About EvoNext" />

        <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
                <div class="flex flex-col items-center gap-12">

                    <!-- Main Heading and Intro -->
                    <div class="text-center space-y-6 w-full p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
                            Share Your Truth.
                        </h1>
                        <p class="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            We asked a simple question: What if you had a space where you could be your most authentic self? A place free from judgment, censorship, and the fear of being silenced?
                        </p>
                        <p class="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            From that question, EvoNext was born.
                        </p>
                    </div>

                    <!-- Mission Section -->
                    <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Free Your Inhibitions ⛓️💥
                        </h2>
                        <p class="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            EvoNext is more than just an application; it's a movement. We are a decentralized social space dedicated to empowering individual expression. Our mission is to provide safe and enjoyable environments where you can confidently explore ideas, curate your digital world, and share your truth with unwavering courage.
                        </p>
                    </div>

                    <!-- Core Pillars Section -->
                    <div class="w-full p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h3 class="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400">
                            Discover. Curate. Share.
                        </h3>
                        <p class="mt-4 text-center text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            At the heart of the EvoNext experience are three core pillars:
                        </p>
                        <ul class="mt-8 space-y-8">
                            <li>
                                <strong class="block text-xl font-semibold text-slate-900 dark:text-slate-100">Discover Safe Spaces:</strong>
                                <span class="block mt-1 text-slate-600 dark:text-slate-400">Dive into a universe of communities and content. Find your niche, connect with like-minded individuals, and engage in conversations that matter, all within environments built on respect and safety.</span>
                            </li>
                            <li>
                                <strong class="block text-xl font-semibold text-slate-900 dark:text-slate-100">Curate Your World:</strong>
                                <span class="block mt-1 text-slate-600 dark:text-slate-400">You are the editor of your experience. Gather, organize, and showcase the content that inspires you. Build a profile and a presence that is a true reflection of your identity and passions.</span>
                            </li>
                            <li>
                                <strong class="block text-xl font-semibold text-slate-900 dark:text-slate-100">Share YOUR Truth Fearlessly ✊:</strong>
                                <span class="block mt-1 text-slate-600 dark:text-slate-400">This is your stage. Whether it's a fleeting thought, a deep conviction, or a creative masterpiece, your voice is paramount. On EvoNext, you are encouraged to speak, create, and engage, knowing your expression is protected.</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Technology Section -->
                    <div class="w-full p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
                        <h3 class="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400">
                            Secured by Dash Platform v2 🛡️
                        </h3>
                        <p class="mt-4 text-center text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                            Our commitment to your freedom and security is absolute. That's why EvoNext is built on the groundbreaking <strong class="text-slate-900 dark:text-slate-100">Dash Platform v2</strong>. This decentralized foundation means:
                        </p>
                        <ul class="mt-8 space-y-4 text-center">
                            <li class="font-medium text-slate-700 dark:text-slate-300"><strong class="text-slate-900 dark:text-slate-100">You Own Your Data:</strong> No central authority controls your account or your content.</li>
                            <li class="font-medium text-slate-700 dark:text-slate-300"><strong class="text-slate-900 dark:text-slate-100">Censorship-Resistant:</strong> Your voice cannot be arbitrarily silenced.</li>
                            <li class="font-medium text-slate-700 dark:text-slate-300"><strong class="text-slate-900 dark:text-slate-100">Unyielding Security:</strong> Your digital presence is protected by a shield of advanced cryptographic security.</li>
                        </ul>
                    </div>

                    <!-- Call to Action -->
                    <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl shadow-2xl ring-2 ring-cyan-400/20">
                        <p class="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Join us on EvoNext, and take the next step in your evolution.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import Header from '@/components/Header.vue'
</script>
