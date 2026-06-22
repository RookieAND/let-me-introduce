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
    <div className="mt-8 mb-8 pt-8 flex justify-between items-center min-h-18">
      <div className="flex items-baseline gap-2.5">
        <Text
          fontFamily="display"
          asChild
          className="text-[clamp(38px,5vw,58px)] font-semibold tracking-[-0.03em] leading-none tabular-nums"
        >
          <motion.span ref={ref}>{rounded}</motion.span>
        </Text>
        <Text
          as="span"
          variant="eyebrow"
          color="accent"
          fontFamily="mono"
          className="text-[clamp(13px,1.5vw,17px)] tracking-widest leading-none"
        >
          posts
        </Text>
      </div>
      <Text as="span" variant="caption" color="subtle" fontFamily="mono" className="text-[11.5px] tracking-[0.06em]">
        2022.12 — 현재
      </Text>
    </div>
  );
}

export function RecentPosts() {
  return (
    <section className="relative py-30 max-compact:py-21" id="study">
      <div className="max-w-280 mx-auto px-8 w-full max-compact:px-5">
        <Reveal className="flex items-baseline gap-4.5">
          <Text variant="caption" color="accent">
            04
          </Text>
          <Text variant="heading4">My Study</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-narrow:hidden">
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
        <Reveal className="flex justify-end mt-8">
          <Text
            variant="body3"
            color="muted"
            fontFamily="mono"
            asChild
            className="hover:text-accent transition-colors duration-200 flex items-center gap-1.75"
          >
            <Link to="/posts">모든 글 보기 →</Link>
          </Text>
        </Reveal>
      </div>
    </section>
  );
}
