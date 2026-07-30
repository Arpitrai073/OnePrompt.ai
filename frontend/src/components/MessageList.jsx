import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import MessageBubble from './MessageBubble'
import LoadingAnimation from './LoadingAnimation'
import { setDraftPrompt } from '../redux/messageSlice'
import { LogoMark } from './Logo'

const STARTERS = [
    { label: "Generate a 1-page NDA", prompt: "Generate a 1-page NDA PDF for a software contractor." },
    { label: "Write a small API", prompt: "Write a Python FastAPI hello-world with one health route." },
    { label: "Search latest AI news", prompt: "Search the web and summarize the latest AI product news in 5 bullets." }
]

function MessageList() {
    const dispatch = useDispatch()
    const {selectedConversation}=useSelector(state=>state.conversation)
    const {messages,isLoading}=useSelector(state=>state.message)
    const bottemRef=useRef(null)
   
   useEffect(()=>{
       requestAnimationFrame(()=>{
        bottemRef?.current?.scrollIntoView({
          behavior:"smooth",
          block:"end"
        })
       })
   },[messages?.length,isLoading])


  return (
    <div className='flex-1 overflow-y-auto px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      
      {messages.length==0 || !selectedConversation ?(
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
           <LogoMark size={44} />
           <div className='flex flex-col gap-1.5'>
               <h1 className='text-[20px] font-semibold text-slate-200 tracking-tight'>OnePrompt</h1>
               <p className='text-[15px] font-semibold text-slate-400 tracking-tight'>Same engine as POST /v1/run</p>
               <p className='text-[13px] text-slate-600 max-w-[280px] leading-relaxed'>Pick Auto or a chip, then ask for a PDF, image, search, or code. Credits are prepaid.</p>
           </div>
           <div className='flex flex-wrap justify-center gap-2 mt-1'>
            {STARTERS.map((s)=>(
              <button
                key={s.label}
                type="button"
                onClick={() => dispatch(setDraftPrompt(s.prompt))}
                className='text-[12px] text-slate-400 bg-white/[0.04] border border-white/[0.07] px-3.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-slate-200 transition-colors duration-150 cursor-pointer'>
                {s.label}
              </button>
            ))}
           </div>
        </div>
      ):
      <div className='space-y-5'>

        {messages?.map((msg,i)=>(
            <div key={`${msg?.role}-${i}-${msg?.content?.slice?.(0, 24) || i}`}>
               <MessageBubble role={msg?.role} content={msg?.content} images={msg.images || []} /> 
            </div>
        ))}

        {isLoading && <LoadingAnimation/>}

        
      </div>
      }
      <div ref={bottemRef}/>
    </div>
  )
}

export default MessageList
