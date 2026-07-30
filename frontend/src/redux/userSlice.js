import { createSlice } from "@reduxjs/toolkit";

const userSlice=createSlice({
    name:"user",
    initialState:{
      userData:null,
      authReady:false,
    },
    reducers:{
        setUserdata:(state,action)=>{
            state.userData=action.payload 
        },
        setAuthReady:(state,action)=>{
            state.authReady=action.payload
        }
    }
   
})

export const {setUserdata,setAuthReady}=userSlice.actions 
export default userSlice.reducer

