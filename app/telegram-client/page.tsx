"use client";

import React from "react";
import styles from "./page.module.css"; 
import Tgclient from "../components/tgclient";

const Home = () => {
  return  (<main className={styles.main}>
            <Tgclient />
           </main>
          )};

export default Home;
