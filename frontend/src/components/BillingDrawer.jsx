import React from 'react'
import { AnimatePresence, motion } from "motion/react"
import { Crown, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { createOrder } from '../features/createOrder'
import { verifyPayment } from '../features/verifyPayment'
import getCurrentUser from '../features/getCurrentUser'
import { setUserdata } from '../redux/userSlice'
import { accountStatus } from '../features/planDisplay'
function BillingDrawer({ open, onClose }) {

    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    const status = accountStatus(userData)
    const [payError, setPayError] = React.useState("")

    const handleUpgrade = async (plan) => {
        setPayError("")
        try {
            const data = await createOrder(plan)
            if (!data?.order?.id || !import.meta.env.VITE_RAZORPAY_KEY_ID) {
                setPayError(data?.message || "Could not start payment. Check Razorpay test keys and try again.")
                return
            }
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: data.order.amount,
                currency: data.order.currency,
                name: "OnePrompt",
                description: `${data?.plan?.name} Plan`,
                order_id: data.order.id,
                handler: async (response) => {
                    try {
                        const result = await verifyPayment(response)
                        if (!result || Array.isArray(result)) {
                            setPayError("Payment could not be verified.")
                            return
                        }
                        const me = await getCurrentUser()
                        if (me) dispatch(setUserdata(me))
                        onClose()
                    } catch (error) {
                        setPayError(error?.response?.data?.message || "Payment could not be verified.")
                    }
                },
                theme: {
                    color: "#4F46E5"
                }
            }

            const razorpay = new window.Razorpay(options)
            razorpay.on("payment.failed", (event) => {
                setPayError(event?.error?.description || "Razorpay could not complete this payment.")
            })
            razorpay.open()
        } catch (error) {
            setPayError(error?.response?.data?.message || "Could not create a Razorpay order. Check billing keys.")
        }
    }
    return (
        <AnimatePresence>
            {open && <> <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: .5 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black z-40"
            />
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ duration: .25 }}
                    className="fixed right-0 top-0 z-50 h-screen w-[380px] bg-[#0f1117] border-l border-white/10 shadow-2xl flex flex-col"

                >

                    <div className='flex items-center justify-between p-5 border-b border-white/10'>
                        <div>
                            <div className='text-white text-lg font-semibold'>
                                Billing
                            </div>
                            <div className='text-slate-400 text-sm'>
                                Plans & Credits
                            </div>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
                        >
                            <X size={18} className="text-slate-300" />
                        </button>
                    </div>


                    {payError && (
                        <div className="mx-5 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-200 leading-relaxed">
                            {payError}
                        </div>
                    )}
                    <div className='p-5'>
                        <div className='rounded-xl bg-white/[0.04] border border-white/10 p-4'>
                            <div className='flex justify-between items-center'>
                                <div>
                                    <p className='text-slate-400 text-sm'>
                                        Your balance
                                    </p>
                                    <h3 className='text-white text-lg font-bold'>
                                        {status.credits} chat · {status.apiCredits} API
                                    </h3>
                                    <p className='text-[12px] text-slate-500 mt-1'>
                                        {status.playgroundPlan} playground · {status.apiPlan} API
                                    </p>
                                </div>
                                <Crown className='text-yellow-400' />
                            </div>

                            <div className='mt-5'>
                                <div className='flex justify-between text-xs text-slate-400 mb-2'>
                                    <span>Playground credits</span>
                                    <span>{userData.credits || 0}/{userData.totalCredits || 100}</span>
                                </div>

                                <div className='h-2 rounded-full bg-white/10 overflow-hidden'>
                                    <div className="h-full bg-indigo-500 transition-all duration-500"
                                        style={{
                                            width: `${(
                                                (userData?.credits || 0) /
                                                (userData?.totalCredits || 1)
                                            ) * 100
                                                }%`
                                        }}
                                    />
                                </div>


                            </div>
                            <div className='mt-4'>
                                <div className='flex justify-between text-xs text-slate-400 mb-2'>
                                    <span>API credits</span>
                                    <span>{userData?.apiCredits ?? userData?.credits ?? 0}</span>
                                </div>
                                <div className='h-2 rounded-full bg-white/10 overflow-hidden'>
                                    <div className="h-full bg-amber-500 transition-all duration-500"
                                        style={{ width: `${Math.min(100, ((userData?.apiCredits ?? 0) / 2000) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='px-5 flex-1 overflow-auto space-y-4 pb-6'>
                        <p className='text-[11px] uppercase tracking-widest text-slate-500'>Playground</p>
                        <div className='rounded-xl border border-white/10 p-4'>
                            <h3 className='text-white font-semibold'>Starter Plan</h3>
                            <p className='text-indigo-400 text-2xl font-bold mt-2'>₹199</p>
                            <p className='text-slate-400 text-sm mt-1'>500 playground credits</p>
                            <button className='mt-4 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 py-2 text-white' onClick={() => handleUpgrade("starter")}>Upgrade</button>
                        </div>
                        <div className='rounded-xl border border-white/10 p-4'>
                            <h3 className='text-white font-semibold'>Pro Plan</h3>
                            <p className='text-indigo-400 text-2xl font-bold mt-2'>₹499</p>
                            <p className='text-slate-400 text-sm mt-1'>1000 playground credits</p>
                            <button className='mt-4 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 py-2 text-white' onClick={() => handleUpgrade("pro")}>Upgrade</button>
                        </div>
                        <p className='text-[11px] uppercase tracking-widest text-slate-500 pt-2'>API wallet</p>
                        <div className='rounded-xl border border-amber-500/20 p-4'>
                            <h3 className='text-white font-semibold'>API Starter</h3>
                            <p className='text-amber-300 text-2xl font-bold mt-2'>₹299</p>
                            <p className='text-slate-400 text-sm mt-1'>2000 API credits for /v1/run</p>
                            <button className='mt-4 w-full rounded-lg bg-amber-600 hover:bg-amber-700 py-2 text-white' onClick={() => handleUpgrade("api_starter")}>Buy API credits</button>
                        </div>
                        <div className='rounded-xl border border-amber-500/20 p-4'>
                            <h3 className='text-white font-semibold'>API Pro</h3>
                            <p className='text-amber-300 text-2xl font-bold mt-2'>₹799</p>
                            <p className='text-slate-400 text-sm mt-1'>8000 API credits for /v1/run</p>
                            <button className='mt-4 w-full rounded-lg bg-amber-600 hover:bg-amber-700 py-2 text-white' onClick={() => handleUpgrade("api_pro")}>Buy API credits</button>
                        </div>
                    </div>








                </motion.div>
            </>
            }

        </AnimatePresence>
    )
}

export default BillingDrawer
