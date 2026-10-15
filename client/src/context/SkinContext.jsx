import { createContext, useContext } from 'react';

/* Which visual skin the shared controls draw in. The storefront is the house
   skin (square, hairline, uppercase micro-type); the admin is the Flowbite
   skin (rounded, boxed, sentence case), set once by AdminLayout. Button, Field
   and Select read it, so one component serves both without a prop at every
   call site. */
const SkinContext = createContext('house');

export const SkinProvider = SkinContext.Provider;
export const useSkin = () => useContext(SkinContext);
