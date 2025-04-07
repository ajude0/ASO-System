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
                    <span class="text-gray-400">Modals</span>
                </span>
            </li>
        </ul>
    </nav>
    <div class="flex items-center bg-white h-full flex flex-col rounded py-6 sm:py-8 lg:py-12">
        <div id=" app">
            <button @click="showModal3 = true"
                class="mx-2 px-2 py-3 text-xs rounded text-white bg-blue-500 focus:outline-none hover:bg-blue-500">Normal
                Modal
            </button> <br><br>
            <button @click="showModal2 = true"
                class="mx-2 px-2 py-3 text-xs rounded text-white bg-blue-500 focus:outline-none hover:bg-blue-500">Medium
                Modal
            </button><br><br>
            <button @click="showModal = true"
                class="mx-2 px-2 py-3 text-xs rounded text-white bg-blue-500 focus:outline-none hover:bg-blue-500">Wide
                Modal
            </button>
            <div v-if="showModal3"
                class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
                <div class="w-full max-w-lg bg-white shadow-lg rounded-lg p-6 relative">
                    <div class="flex items-center pb-3 border-b border-gray-300">
                        <h3 class="text-gray-800 text-xl font-bold flex-1">Normal Modal</h3>
                        <svg @click="showModal3 = false" xmlns="http://www.w3.org/2000/svg"
                            class="w-3 ml-2 cursor-pointer shrink-0 fill-gray-400 hover:fill-red-500"
                            viewBox="0 0 320.591 320.591">
                            <path
                                d="M30.391 318.583a30.37 30.37 0 0 1-21.56-7.288c-11.774-11.844-11.774-30.973 0-42.817L266.643 10.665c12.246-11.459 31.462-10.822 42.921 1.424 10.362 11.074 10.966 28.095 1.414 39.875L51.647 311.295a30.366 30.366 0 0 1-21.256 7.288z"
                                data-original="#000000"></path>
                            <path
                                d="M287.9 318.583a30.37 30.37 0 0 1-21.257-8.806L8.83 51.963C-2.078 39.225-.595 20.055 12.143 9.146c11.369-9.736 28.136-9.736 39.504 0l259.331 257.813c12.243 11.462 12.876 30.679 1.414 42.922-.456.487-.927.958-1.414 1.414a30.368 30.368 0 0 1-23.078 7.288z"
                                data-original="#000000"></path>
                        </svg>
                    </div>

                    <div class="my-6">
                        <p class="text-gray-600 text-sm leading-relaxed">Lorem ipsum dolor sit amet,
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
                            tempor
                            incididunt ut
                            labore
                            et
                            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                            ullamco
                            laboris nisi ut
                            aliquip
                            ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
                            velit
                            esse cillum
                            dolore eu
                            fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
                            in culpa
                            qui officia
                            deserunt mollit anim id est laborum.</p>
                    </div>

                    <div class="border-t border-gray-300 pt-6 flex justify-end gap-4">
                        <button type="button" @click="showModal3 = false"
                            class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200">Close</button>
                        <button type="button"
                            class="px-4 py-2 rounded-lg text-white text-sm border-none outline-none tracking-wide bg-blue-600 hover:bg-blue-700 active:bg-blue-600">Save</button>
                    </div>
                </div>
            </div>
            <div v-if="showModal2"
                class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
                <div class="w-full max-w-xl bg-white shadow-lg rounded-lg p-6 relative">
                    <div class="flex items-center pb-3 border-b border-gray-300">
                        <h3 class="text-gray-800 text-xl font-bold flex-1">Medium modal</h3>
                        <svg @click="showModal2 = false" xmlns="http://www.w3.org/2000/svg"
                            class="w-3 ml-2 cursor-pointer shrink-0 fill-gray-400 hover:fill-red-500"
                            viewBox="0 0 320.591 320.591">
                            <path
                                d="M30.391 318.583a30.37 30.37 0 0 1-21.56-7.288c-11.774-11.844-11.774-30.973 0-42.817L266.643 10.665c12.246-11.459 31.462-10.822 42.921 1.424 10.362 11.074 10.966 28.095 1.414 39.875L51.647 311.295a30.366 30.366 0 0 1-21.256 7.288z"
                                data-original="#000000"></path>
                            <path
                                d="M287.9 318.583a30.37 30.37 0 0 1-21.257-8.806L8.83 51.963C-2.078 39.225-.595 20.055 12.143 9.146c11.369-9.736 28.136-9.736 39.504 0l259.331 257.813c12.243 11.462 12.876 30.679 1.414 42.922-.456.487-.927.958-1.414 1.414a30.368 30.368 0 0 1-23.078 7.288z"
                                data-original="#000000"></path>
                        </svg>
                    </div>

                    <div class="my-6">
                        <form class="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
                            <div>
                                <label for="first-name"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">First
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
                                <label for="Contact"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Contact
                                </label>
                                <input name="Contact"
                                    class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                            </div>

                            <div class="sm:col-span-2">
                                <label for="email"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Email</label>
                                <input name="email"
                                    class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                            </div>
                            <div class="sm:col-span-2">
                                <label for="message"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Message</label>
                                <textarea name="message"
                                    class="h-64 w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring"></textarea>
                            </div>
                        </form>
                    </div>

                    <div class="border-t border-gray-300 pt-6 flex justify-end gap-4">
                        <button type="button" @click="showModal2 = false"
                            class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200">Close</button>
                        <button type="button"
                            class="mx-2 px-4 py-2 text-sm rounded text-white bg-blue-500 focus:outline-none hover:bg-blue-300">Send</button>
                    </div>
                </div>
            </div>
            <div v-if="showModal"
                class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
                <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
                    <div class="flex items-center pb-3 border-b border-gray-300">
                        <h3 class="text-gray-800 text-xl font-bold flex-1">Wide modal</h3>
                        <svg @click="showModal = false" xmlns="http://www.w3.org/2000/svg"
                            class="w-3 ml-2 cursor-pointer shrink-0 fill-gray-400 hover:fill-red-500"
                            viewBox="0 0 320.591 320.591">
                            <path
                                d="M30.391 318.583a30.37 30.37 0 0 1-21.56-7.288c-11.774-11.844-11.774-30.973 0-42.817L266.643 10.665c12.246-11.459 31.462-10.822 42.921 1.424 10.362 11.074 10.966 28.095 1.414 39.875L51.647 311.295a30.366 30.366 0 0 1-21.256 7.288z"
                                data-original="#000000"></path>
                            <path
                                d="M287.9 318.583a30.37 30.37 0 0 1-21.257-8.806L8.83 51.963C-2.078 39.225-.595 20.055 12.143 9.146c11.369-9.736 28.136-9.736 39.504 0l259.331 257.813c12.243 11.462 12.876 30.679 1.414 42.922-.456.487-.927.958-1.414 1.414a30.368 30.368 0 0 1-23.078 7.288z"
                                data-original="#000000"></path>
                        </svg>
                    </div>

                    <div class="my-6">
                        <form class="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
                            <div>
                                <label for="first-name"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">First
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
                                <label for="Contact"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Contact
                                </label>
                                <input name="Contact"
                                    class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                            </div>

                            <div class="sm:col-span-2">
                                <label for="email"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Email</label>
                                <input name="email"
                                    class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring" />
                            </div>
                            <div class="sm:col-span-2">
                                <label for="message"
                                    class="mb-2 inline-block text-sm text-gray-800 sm:text-base">Message</label>
                                <textarea name="message"
                                    class="h-64 w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring"></textarea>
                            </div>
                        </form>
                    </div>

                    <div class="border-t border-gray-300 pt-6 flex justify-end gap-4">
                        <button type="button" @click="showModal = false"
                            class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200">Close</button>
                        <button type="button"
                            class="mx-2 px-4 py-2 text-sm rounded text-white bg-blue-500 focus:outline-none hover:bg-blue-300">Send</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import VModal from '../main/components/Modal.vue'
const showModal = ref(false)
const showModal2 = ref(false)
const showModal3 = ref(false)

</script>
