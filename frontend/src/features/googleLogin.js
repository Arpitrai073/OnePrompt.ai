import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "../../utils/firebase"
import api from "../../utils/axios"
import { setUserdata } from "../redux/userSlice"

export const signInWithGoogle = async (dispatch) => {
    const data = await signInWithPopup(auth, googleProvider)
    const token = await data.user.getIdToken()
    const { data: user } = await api.post("/api/auth/login", { token })
    dispatch(setUserdata(user))
    return user
}
