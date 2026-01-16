<!-- src/screens/Launcher.vue -->
<template>
    <main>
        <Header title="Token Launcher" />

        <section class="bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen rounded-2xl mx-4">
            <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div class="space-y-8">
                    <!-- Stepper Header -->
                    <div class="relative pt-8 pb-6">
                        <div class="overflow-hidden h-2 mb-6 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                            <div
                                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-sky-500 transition-all duration-500 ease-in-out"
                                :style="{ width: `${progressWidth}%` }"
                            ></div>
                        </div>
                        <div class="flex flex-wrap justify-between text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider gap-2">
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 0}">1. Details</span>
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 1}">2. Supply & Rules</span>
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 2}">3. Distribution & Pricing</span>
                            <span :class="{'text-sky-500 dark:text-sky-400': currentStepIdx >= 3}">4. Review</span>
                        </div>
                    </div>

                    <!-- Step 1: Details -->
                    <div v-if="step === 'details'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center space-y-2">
                            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                                Launch a New Token
                            </h1>
                            <p class="text-lg text-slate-600 dark:text-slate-400">
                                Define display conventions and basic metadata for your token.
                            </p>
                        </div>

                        <div>
                            <label for="tokenName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Token Name</label>
                            <input
                                v-model="form.tokenName"
                                id="tokenName"
                                type="text"
                                placeholder="My Token"
                                class="mt-1 block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="symbol" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Symbol</label>
                                <input
                                    v-model="form.symbol"
                                    id="symbol"
                                    type="text"
                                    placeholder="MTK"
                                    maxlength="8"
                                    class="mt-1 block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                            </div>

                            <div>
                                <label for="decimals" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Decimals</label>
                                <input
                                    v-model.number="form.decimals"
                                    id="decimals"
                                    type="number"
                                    min="0"
                                    max="18"
                                    class="mt-1 block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Display Conventions (Optional)</label>
                            <div class="mt-2 grid grid-cols-2 gap-4">
                                <input
                                    v-model="form.displayName"
                                    type="text"
                                    placeholder="Plural (e.g. My Tokens)"
                                    class="block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                                <input
                                    v-model="form.displayNameSingular"
                                    type="text"
                                    placeholder="Singular (e.g. My Token)"
                                    class="block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div class="pt-4 flex gap-2">
                            <button
                                @click="nextStep"
                                :disabled="!canProceedFromDetails"
                                class="ml-auto inline-flex justify-center rounded-2xl bg-sky-600 hover:bg-sky-500 py-3 px-6 text-base font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next: Supply & Rules
                            </button>
                        </div>
                    </div>

                    <!-- Step 2: Supply & Rules -->
                    <div v-if="step === 'supply'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center space-y-2">
                            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Supply & Rules</h2>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Set base/max supply and who controls token actions.</p>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Base Supply (immutable)</label>
                                <input
                                    v-model.number="form.baseSupply"
                                    type="number"
                                    min="0"
                                    class="mt-1 block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Maximum Supply (optional)</label>
                                <input
                                    v-model="form.maxSupplyStr"
                                    type="text"
                                    placeholder="Leave empty for unlimited"
                                    class="mt-1 block w-full rounded-md border-0 py-3 px-3 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:focus:ring-sky-400 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <input id="startPaused" type="checkbox" v-model="form.startPaused" class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sky-500 focus:ring-sky-500" />
                            <label for="startPaused" class="text-sm text-slate-900 dark:text-slate-100">Start token paused (disables transfers until unpaused)</label>
                        </div>

                        <div class="pt-2">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Keep History</label>
                            <div class="mt-1 flex gap-2">
                                <button
                                    @click="form.keepHistory = true"
                                    :class="form.keepHistory ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                                    class="px-3 py-2 rounded"
                                >Yes</button>
                                <button
                                    @click="form.keepHistory = false"
                                    :class="!form.keepHistory ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                                    class="px-3 py-2 rounded"
                                >No</button>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Main Control Group</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400">Group can be referenced to grant permissions (mint/burn/pause/etc.).</p>

                            <div class="mt-3 space-y-3">
                                <div v-for="(g, idx) in groups" :key="g.id" class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <div class="flex justify-between items-center">
                                        <div class="font-medium text-slate-900 dark:text-slate-100">
                                            {{ g.name || 'Group ' + (idx + 1) }}
                                            <span class="text-xs text-slate-500 ml-2">Threshold: {{ g.threshold }}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <button @click="removeGroup(idx)" class="text-red-500 text-sm">Remove</button>
                                        </div>
                                    </div>

                                    <div class="mt-2 space-y-2">
                                        <div class="grid grid-cols-12 gap-2 items-center">
                                            <input v-model="g.name" placeholder="Group name (optional)" class="col-span-8 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                            <input v-model.number="g.threshold" type="number" min="1" class="col-span-4 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>

                                        <div class="space-y-2 mt-2">
                                            <div v-for="(m, mi) in g.members" :key="mi" class="flex items-center gap-2">
                                                <input v-model="m.identity" placeholder="Member identity id / address" class="flex-1 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                                <input v-model.number="m.power" type="number" min="1" class="w-20 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                                <button @click="removeMember(idx, mi)" class="text-red-500 text-sm">✕</button>
                                            </div>

                                            <div class="flex gap-2">
                                                <button @click="addMember(idx)" class="text-sm text-sky-600">+ Add member</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <button @click="addGroup" class="inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 py-2 px-3 text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">+ Add Control Group</button>
                                    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">You can set groups to control minting, burning, freezing, and other actions.</p>
                                </div>
                            </div>
                        </div>

                        <div class="pt-4 flex justify-between">
                            <button @click="prevStep" class="rounded-2xl border border-slate-300 dark:border-slate-700 py-2 px-4 text-sm">Back</button>
                            <button
                                @click="nextStep"
                                :disabled="!canProceedFromSupply"
                                class="inline-flex justify-center rounded-2xl bg-sky-600 hover:bg-sky-500 py-3 px-6 text-base font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next: Distribution & Pricing
                            </button>
                        </div>
                    </div>

                    <!-- Step 3: Distribution & Pricing -->
                    <div v-if="step === 'distribution'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center space-y-2">
                            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Distribution & Pricing</h2>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Choose how new tokens will be introduced and whether users can buy tokens directly.</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Distribution Method</label>
                            <div class="mt-2 flex gap-2">
                                <button
                                    v-for="opt in distributionOptions"
                                    :key="opt.value"
                                    @click="form.distributionMethod = (opt.value as 'manual' | 'programmed' | 'perpetual')"
                                    :class="form.distributionMethod === opt.value ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                                    class="px-3 py-2 rounded text-sm"
                                >
                                    {{ opt.label }}
                                </button>
                            </div>
                            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Programmed and Perpetual distributions support scheduling and automated releases.</p>
                        </div>

                        <div v-if="form.distributionMethod === 'programmed'">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-3">Programmed Releases</label>
                            <div v-for="(r, idx) in form.programmedReleases" :key="idx" class="mt-2 p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div class="grid grid-cols-3 gap-2">
                                    <input v-model="r.timestamp" type="datetime-local" class="col-span-2 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                    <input v-model.number="r.amount" type="number" min="0" class="col-span-1 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                </div>
                                <div class="mt-2 text-right">
                                    <button @click="removeProgrammedRelease(idx)" class="text-red-500 text-sm">Remove</button>
                                </div>
                            </div>

                            <div class="mt-2">
                                <button @click="addProgrammedRelease" class="text-sky-600 text-sm">+ Add release</button>
                            </div>
                        </div>

                        <div v-if="form.distributionMethod === 'perpetual'">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-3">Perpetual Schedule</label>
                            <div class="mt-2 grid grid-cols-2 gap-2">
                                <input v-model.number="form.perpetual.interval" type="number" min="1" class="rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                <select v-model="form.perpetual.unit" class="rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                    <option value="blocks">Blocks</option>
                                    <option value="seconds">Seconds</option>
                                </select>
                                <input v-model.number="form.perpetual.amount" type="number" min="0" placeholder="Amount per interval" class="col-span-2 rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                            </div>
                        </div>

                        <div class="pt-3">
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Enable Direct Purchase</label>
                            <div class="mt-2 flex items-center gap-3">
                                <input id="enableBuy" type="checkbox" v-model="form.directPurchase.enabled" class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sky-500" />
                                <label for="enableBuy" class="text-sm text-slate-900 dark:text-slate-100">Allow users to buy tokens for Platform credits</label>
                            </div>

                            <div v-if="form.directPurchase.enabled" class="mt-2 grid grid-cols-2 gap-2">
                                <input v-model="form.directPurchase.price" type="number" min="0" step="0.0001" placeholder="Price (credits per token)" class="rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                <input v-model.number="form.directPurchase.minAmount" type="number" min="1" placeholder="Min purchase" class="rounded-md border-0 py-2 px-2 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                            </div>
                        </div>

                        <div class="pt-4 flex justify-between">
                            <button @click="prevStep" class="rounded-2xl border border-slate-300 dark:border-slate-700 py-2 px-4 text-sm">Back</button>
                            <button @click="nextStep" :disabled="!canProceedFromDistribution" class="inline-flex justify-center rounded-2xl bg-sky-600 hover:bg-sky-500 py-3 px-6 text-base font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
                                Next: Review
                            </button>
                        </div>
                    </div>

                    <!-- Step 4: Review -->
                    <div v-if="step === 'review'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Review & Deploy</h2>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Confirm settings and deploy the data contract that will host your token.</p>
                        </div>

                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div class="flex justify-between">
                                    <div>
                                        <div class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ form.tokenName }} ({{ form.symbol }})</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400">Decimals: {{ form.decimals }}, Base: {{ form.baseSupply }}, Max: {{ displayMaxSupply }}</div>
                                    </div>
                                    <div class="text-sm text-slate-500 dark:text-slate-400">Start paused: <span class="font-semibold text-slate-900 dark:text-slate-100">{{ form.startPaused ? 'Yes' : 'No' }}</span></div>
                                </div>
                            </div>

                            <div class="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div class="text-sm font-medium text-slate-900 dark:text-slate-100">Groups</div>
                                <div v-if="groups.length > 0" class="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                                    <div v-for="(g, i) in groups" :key="g.id">
                                        <div class="font-medium text-slate-900 dark:text-slate-100">{{ g.name || 'Group ' + (i + 1) }} — threshold {{ g.threshold }}</div>
                                        <div class="mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            <div v-for="m in g.members" class="font-mono text-slate-700 dark:text-slate-200">{{ m.identity }} (pwr: {{ m.power }})</div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-xs text-slate-500 italic">No groups configured.</div>
                            </div>

                            <div class="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div class="text-sm font-medium text-slate-900 dark:text-slate-100">Distribution</div>
                                <div class="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Method: <span class="font-medium text-slate-900 dark:text-slate-100 capitalize">{{ form.distributionMethod }}</span>

                                    <div v-if="form.distributionMethod === 'programmed' && form.programmedReleases.length" class="mt-2 border-l-2 border-slate-300 pl-2">
                                        <div v-for="(r, idx) in form.programmedReleases" :key="idx" class="text-xs py-1">
                                            {{ new Date(r.timestamp).toLocaleString() }} → {{ r.amount }} tokens
                                        </div>
                                    </div>

                                    <div v-if="form.distributionMethod === 'perpetual' && form.perpetual.interval" class="mt-2 border-l-2 border-slate-300 pl-2">
                                        Emit {{ form.perpetual.amount }} tokens every {{ form.perpetual.interval }} {{ form.perpetual.unit }}
                                    </div>

                                    <div v-if="form.directPurchase.enabled" class="mt-3 bg-sky-50 dark:bg-sky-900/20 p-2 rounded border border-sky-100 dark:border-sky-800">
                                        <p class="font-medium text-sky-700 dark:text-sky-300 text-xs">Direct Purchase Enabled</p>
                                        <p class="text-xs">{{ form.directPurchase.price }} credits/token (Min: {{ form.directPurchase.minAmount }})</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="pt-4 flex justify-between">
                            <button @click="prevStep" class="rounded-2xl border border-slate-300 dark:border-slate-700 py-2 px-4 text-sm">Back</button>
                            <button @click="deployToken" class="inline-flex justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 px-6 text-base font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
                                Launch Token
                            </button>
                        </div>
                    </div>

                    <!-- Loading / Deploying -->
                    <div v-if="step === 'loading'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                        <div class="flex justify-center">
                            <div class="relative flex h-16 w-16">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                <span class="relative inline-flex rounded-full h-16 w-16 bg-emerald-600 items-center justify-center text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M13 5v6m0 0v6m0-6h6" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ loadingState }}</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">This may take a few seconds while the contract is registered on-chain.</p>
                    </div>

                    <!-- Success -->
                    <div v-if="step === 'success'" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-center">
                            <h3 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Token Launched</h3>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Your token has been created on the Platform.</p>
                        </div>

                        <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p class="text-xs text-slate-500">Data Contract ID</p>
                            <p class="font-mono text-sm break-all text-slate-900 dark:text-slate-100">{{ deployedContractId || '—' }}</p>
                        </div>

                        <div class="pt-4">
                            <button @click="goToTokens" class="w-full inline-flex justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 py-3 px-6 text-base font-semibold text-white shadow-sm transition">
                                View Tokens
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'

/**
 * Type Definitions
 */
type GroupMember = { identity: string; power: number }
type ControlGroup = { id: string; name?: string; threshold: number; members: GroupMember[] }
type Step = 'details' | 'supply' | 'distribution' | 'review' | 'loading' | 'success'

/**
 * Router & State
 */
const router = useRouter()

const step = ref<Step>('details')
const steps = ['details', 'supply', 'distribution', 'review'] as const

const currentStepIdx = computed(() => steps.indexOf(step.value as 'details' | 'supply' | 'distribution' | 'review'))
const progressWidth = computed(() => ((currentStepIdx.value + 1) / steps.length) * 100)

/**
 * Form Data
 */
const form = reactive({
    tokenName: '',
    symbol: '',
    decimals: 8,
    displayName: '',
    displayNameSingular: '',
    baseSupply: 100000,
    maxSupplyStr: '',
    startPaused: false,
    keepHistory: true,
    distributionMethod: 'manual' as 'manual' | 'programmed' | 'perpetual',
    programmedReleases: [] as { timestamp: string; amount: number }[],
    perpetual: { interval: 0, unit: 'blocks', amount: 0 },
    directPurchase: { enabled: false, price: 0, minAmount: 1 }
})

const groups = ref<ControlGroup[]>([])
const loadingState = ref('Preparing deployment...')
const deployedContractId = ref<string | null>(null)

/**
 * Static Data
 */
const distributionOptions = [
    { value: 'manual', label: 'Manual minting' },
    { value: 'programmed', label: 'Programmed' },
    { value: 'perpetual', label: 'Perpetual' }
]

/**
 * Computed Validation
 */
const canProceedFromDetails = computed(() => {
    return form.tokenName.trim().length >= 1 &&
           form.symbol.trim().length >= 1 &&
           form.decimals >= 0
})

const canProceedFromSupply = computed(() => {
    if (form.baseSupply < 0) return false
    // Check groups if any added
    for (const g of groups.value) {
        if (g.threshold < 1) return false
        if (!g.members.length) return false
    }
    return true
})

const canProceedFromDistribution = computed(() => {
    if (form.distributionMethod === 'programmed') {
        return form.programmedReleases.every(r => r.timestamp && r.amount > 0)
    }
    if (form.distributionMethod === 'perpetual') {
        return form.perpetual.interval > 0 && form.perpetual.amount > 0
    }
    return true
})

const displayMaxSupply = computed(() => form.maxSupplyStr ? form.maxSupplyStr : 'Unlimited')

/**
 * Actions
 */
const nextStep = () => {
    if (step.value === 'details' && canProceedFromDetails.value) step.value = 'supply'
    else if (step.value === 'supply' && canProceedFromSupply.value) step.value = 'distribution'
    else if (step.value === 'distribution' && canProceedFromDistribution.value) step.value = 'review'
}

const prevStep = () => {
    if (step.value === 'supply') step.value = 'details'
    else if (step.value === 'distribution') step.value = 'supply'
    else if (step.value === 'review') step.value = 'distribution'
}

const addGroup = () => {
    groups.value.push({
        id: cryptoRandomId(),
        name: '',
        threshold: 1,
        members: [{ identity: '', power: 1 }]
    })
}

const removeGroup = (idx: number) => {
    groups.value.splice(idx, 1)
}

const addMember = (groupIdx: number) => {
    groups.value[groupIdx]?.members.push({ identity: '', power: 1 })
}

const removeMember = (groupIdx: number, memberIdx: number) => {
    groups.value[groupIdx]?.members.splice(memberIdx, 1)
}

const addProgrammedRelease = () => {
    form.programmedReleases.push({ timestamp: new Date().toISOString().slice(0, 16), amount: 0 })
}

const removeProgrammedRelease = (idx: number) => {
    form.programmedReleases.splice(idx, 1)
}

const buildTokenPayload = () => {
    return {
        name: form.tokenName,
        symbol: form.symbol,
        decimals: form.decimals,
        displayName: form.displayName,
        displayNameSingular: form.displayNameSingular,
        baseSupply: form.baseSupply,
        maxSupply: form.maxSupplyStr ? form.maxSupplyStr : null,
        startPaused: form.startPaused,
        keepHistory: form.keepHistory,
        groups: groups.value.map(g => ({
            name: g.name,
            threshold: g.threshold,
            members: g.members.map(m => ({ identity: m.identity, power: m.power }))
        })),
        distribution: {
            method: form.distributionMethod,
            programmed: form.programmedReleases.slice(),
            perpetual: { ...form.perpetual }
        },
        directPurchase: form.directPurchase.enabled ? { ...form.directPurchase } : null
    }
}

const deployToken = async () => {
    try {
        step.value = 'loading'
        loadingState.value = 'Building token contract...'

        const tokenPayload = buildTokenPayload()
        console.log('[TokenLauncher] payload', tokenPayload)

        // TODO: replace with invoke('create_token_contract', { payload: tokenPayload }) or call your SDK
        // Example:
        // const contractId = await invoke('create_token_contract', { payload: tokenPayload })

        // Simulating network delay
        await sleep(1500)
        loadingState.value = 'Registering contract on network...'
        await sleep(1800)

        // TODO: set deployedContractId to actual returned contract id
        deployedContractId.value = 'dc:' + cryptoRandomId()

        loadingState.value = 'Finalizing token configuration...'
        await sleep(700)

        step.value = 'success'
    } catch (err) {
        console.error('[TokenLauncher] deploy error', err)
        alert('Failed to deploy token. See console for details.')
        step.value = 'review'
    }
}

const goToTokens = () => {
    router.push('/tokens')
}

/**
 * Utilities
 */
function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function cryptoRandomId() {
    return Math.random().toString(36).slice(2, 10)
}

onMounted(() => {
    // TODO: register any listeners (Tauri event listeners) for deployment progress
})

onUnmounted(() => {
    // TODO: remove listeners / clean up
})
</script>
