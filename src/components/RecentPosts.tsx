import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PostCard } from "#/components/posts/PostCard";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { ALL_POSTS } from "#/data/Posts";
import { useCountAnimation } from "#/hooks/UseCountAnimation";

const recent = [...ALL_POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

function PostCount() {
  const { rounded, ref } = useCountAnimation(ALL_POSTS.length);
  return (
    <div className="mt-8 mb-8 pt-8 border-t border-border flex justify-between items-center">
      <div className="flex justify-between items-baseline gap-2.5">
        <motion.span
          ref={ref}
          className="font-display text-[clamp(38px,5vw,58px)] font-semibold tracking-[-0.03em] leading-none tabular-nums"
        >
          {rounded}
        </motion.span>
        <span className="font-mono text-accent text-[clamp(13px,1.5vw,17px)] tracking-[0.1em] uppercase leading-none">
          posts
        </span>
      </div>
      <span className="font-mono text-text-3 text-[11.5px] tracking-[0.06em]">
        2022.12 — 현재
      </span>
    </div>
  );
}

export function RecentPosts() {
  return (
    <section className="relative py-30 max-[520px]:py-21" id="study">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-4.5">
          <Text variant="caption" color="accent">
            04
          </Text>
          <Text variant="heading4">My Study</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            {"// 배운 것들을 꾸준히 기록해왔습니다"}
          </Text>
        </Reveal>
        <Reveal>
          <PostCount />
        </Reveal>

        <div className="flex flex-col">
          {recent.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.05}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
        <div className="border-b border-border" />

        <Reveal className="flex justify-end mt-8">
          <Link
            to="/posts"
            className="font-mono text-[13px] text-text-2 hover:text-accent transition-colors duration-200 flex items-center gap-1.75"
          >
            모든 글 보기 →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
