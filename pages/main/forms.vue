<template>
    <nav class="flex mb-5 h-13 bg-gray-100 rounded-lg" aria-label="Breadcrumb">
        <ul class="p-4 flex flex-wrap space-x-3 text-sm font-medium">
            <li class="flex items-center space-x-3">
                <a @click="dashboard()" class="cursor-pointer flex items-center space-x-1 text-gray-800">
                    <svg class="h-4 w-4 shrink-0 fill-gray-500" aria-hidden="true" viewBox="0 0 256 256">
                        <path
                            d="M184 32H72A16 16 0 0056 48V224a8.1 8.1.0 004.1 7 7.6 7.6.0 003.9 1 7.9 7.9.0 004.2-1.2L128 193.4l59.7 37.4a8.3 8.3.0 008.2.2 8.1 8.1.0 004.1-7V48A16 16 0 00184 32z">
                        </path>
                    </svg>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="flex items-center space-x-3" aria-current="page">
                <div aria-hidden="true" class="h-4 w-px rotate-12 rounded-full bg-gray-300"></div>

                <span class="flex items-center space-x-1">
                    <svg class="h-4 w-4 shrink-0 fill-gray-400" aria-hidden="true" viewBox="0 0 256 256">
                        <path
                            d="M136 88H120V35.3L91.7 63.6A8 8 0 0180.3 52.3l42-42a8.1 8.1.0 0111.4.0l42 42a8 8 0 010 11.3 8 8 0 01-11.4.0L136 35.3zm64 0H136v40a8 8 0 01-16 0V88H56a16 16 0 00-16 16V208a16 16 0 0016 16H2e2a16 16 0 0016-16V104A16 16 0 002e2 88z">
                        </path>
                    </svg>
                    <span class="text-gray-400">Forms</span>
                </span>
            </li>
        </ul>
    </nav>

    <div class="bg-white py-6 sm:py-8 lg:py-50">
        <div class="mx-auto max-w-screen-2xl px-4 md:px-8">
            <div class="mb-10 md:mb-16">
                <h2 class="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-6 lg:text-3xl">FORMS</h2>
            </div>
            <form class="mx-auto grid max-w-screen-md gap-4 sm:grid-cols-2">
                <div>
                    <label for="first-name" class="mb-2 inline-block text-sm text-gray-800 sm:text-base">First
                        name</label>
                    <input name="first-name"
                        class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                </div>

                <div>
                    <label for="last-name" class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Last
                        name</label>
                    <input name="last-name"
                        class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                </div>

                <div class="sm:col-span-2">
                    <label for="Contact" class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Contact
                    </label>
                    <input name="Contact"
                        class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                </div>

                <div class="sm:col-span-2">
                    <label for="email" class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Email</label>
                    <input name="email"
                        class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                </div>
                <div class="sm:col-span-2">
                    <label for="message" class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Message</label>
                    <textarea name="message"
                        class="h-64 w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring"></textarea>
                </div>

                <div class="flex items-center justify-between sm:col-span-2">
                    <button
                        class="mx-2 px-4 py-2 text-sm rounded text-white bg-blue-500 focus:outline-none hover:bg-blue-300">Send</button>

                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
const router = useRouter();
function dashboard() {
    router.push('/main/dashboard');
}

</script>

<style></style>