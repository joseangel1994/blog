---
title: 'Kubernetes: Node Affinity, Taints and Tolerations'
description: When speaking about Kubernetes, precision resource optimization stands as a foundational pillar. The ability to specifically direct pods to particular nodes in a Kubernetes cluster plays a crucial role in planning and executing applications.
pubDate: 2024-02-19 11:00
author: Jose Ángel Expósito Arenas
tags:
  - Kubernetes
  - Software
imgUrl: '../../assets/kubernetes-node-affinity/kubernetes.jpeg'
layout: ../../layouts/BlogPost.astro
---

![Kubernetes cluster](../../assets/kubernetes-node-affinity/kubernetes.jpeg)

## Introduction

When speaking about Kubernetes, precision resource optimization stands as a foundational pillar. The ability to specifically direct pods to particular nodes in a Kubernetes cluster plays a crucial role in planning and executing applications. This not only optimizes resource efficiency but also allows for greater adaptability in highly specific environments.

While there are well-known methods like [label selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/) or [node selector](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector), this article focuses on three concepts, divided into two groups: Node Affinity on one side and Taints and Tolerations on the other. We'll explore how to use both options and how they can complement each other to provide detailed control over pod assignment to specific nodes.

## Affinity and Anti-Affinity

NodeSelector represents the easiest method for restricting pods to nodes with specific labels. Node Affinity and Anti-Affinity serve to expand the spectrum of constraints that can be defined. Using node affinity and anti-affinity has some advantages like:

- Enhanced expressiveness: Affinity/anti-affinity introduces a more nuanced language compared to nodeSelector. While nodeSelector strictly chooses nodes with all the designated labels, the affinity/anti-affinity framework affords greater control over the selection logic.
- Soft or preferred rules: With affinity/anti-affinity, it is possible to designate a rule as soft or preferred. In such cases, the scheduler will still allocate the Pod, even if an exact match with a node cannot be found.
- Extended label constraints: Affinity/anti-affinity enables the imposition of constraints on a Pod based on labels of other Pods running on the node or within other topological domains. This flexibility allows the definition of rules governing the co-location of Pods on a node.

## Node Affinity

Consider [Node Affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity) as a refined strategy for orchestrating the placement of your Pods, comparable to a selective matchmaking process based on node labels. Within this context, we encounter two distinctive variants of node affinity:

- **requiredDuringSchedulingIgnoredDuringExecution:** Think of this as the meticulous curator of your Pod guest list. The scheduler won't greenlight the Pod's attendance unless it aligns precisely with the predefined criteria. In essence, it mirrors the functionality of nodeSelector.
- **preferredDuringSchedulingIgnoredDuringExecution:** . The scheduler tries to locate a node that aligns with the specified rule. However, if there is no perfect match, the scheduler proceeds to schedule the Pod, showcasing a flexibility that adapts to availability without compromising the essence of the rule.

Let's see an example of how Node Affinity with **`requiredDuringSchedulingIgnoredDuringExecution`** could be defined in a PodSpec file:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-node-affinity-required
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: app
            operator: In
            values:
            - my-test-app
```

In this example, we see how a rule is defined using Node Affinity. The Pod can only be deployed on nodes with the label "app," and the value of that label must be "my-test-app."

This example uses the **`operator`** field to specify the logical operator Kubernetes should use when defining this rule. You can find more information about operators [here](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#operators).

Now, let's explore an example with **`preferredDuringSchedulingIgnoredDuringExecution`**:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-node-affinity-preferred
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: first-label
            operator: In
            values:
            - value-1
      - weight: 50
        preference:
          matchExpressions:
          - key: second-label
            operator: In
            values:
            - value-2
```

In this example, I have introduced the concept of weight. You can define a weight between 1 and 100 for each instance of the **`preferredDuringSchedulingIgnoredDuringExecution`** affinity type. Once the scheduler identifies nodes aligning with all other prerequisites for scheduling the Pod, it systematically navigates through each preferred rule satisfied by the node. Subsequently, it aggregates the weight assigned to that particular expression, contributing to an overall sum. This process ensures a meticulous evaluation of preferred rules, factoring in their respective weights to determine the most suitable node for the Pod's deployment.

Given this, we can explain the complete example. We have two possible nodes that satisfy the **`preferredDuringSchedulingIgnoredDuringExecution`** rule. The scheduler evaluates the weight of each node, adds the weight to the other scores of that node, and schedules the Pod on the node with the highest score.

## Taints and Tolerations

As we have seen before, Node affinity functions like a magnetic pull for Pods, either as a preference or a strict requirement, attracting them to a specific set of nodes. On the other side, we have **[Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/).** A Taint is a label that is applied to a node in a Kubernetes cluster which means that a node is not able to schedule pods that do not have the corresponding “toleration”.

Placing a taint on a node is really easy using the following command:

```bash
kubectl taint nodes node_with_taint dedicated=LoadTest:NoSchedule
```

Now, let's talk about **Tolerations**. A Toleration is a label that can be applied to a pod. These are like special permissions granted to Pods. Tolerations give the scheduler the green light to schedule Pods that can handle matching taints. **The toleration will match the taint if both key and value are the same.** However, it's important to note that tolerations, while enabling scheduling, don't guarantee it. The scheduler takes a holistic approach, considering various parameters during its decision-making process.

The tolerations are specified in the PodSpec, with the following structure:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-with-tolerations
spec:
  containers:
    - name: my-container
      image: my-image
	tolerations:
	- key: "dedicated"
	  operator: "Equal"
	  value: "LoadTest"
	  effect: "NoSchedule"
```

This toleration means that the pod can be scheduled on a node that has the taint `dedicated=LoadTest:NoSchedule`.

What about the *effect* property? It describes how pods are affected when using taints. There are three possible cases:

- **NoExecute**: affects the pods already running on the node. If the pods don't tolerate the taint, they are evicted from the node.
- **NoSchedule**: new Pods will be scheduled on the node only if they have a matching toleration, but in this case, the current Pods running on the node are not evicted.
- **PreferNoSchedule**: light version of NoSchedule: The scheduler will try to avoid scheduling the pod on a tainted node, but it's not guaranteed.

These effects allows multiple configurations, as multiple taints can be added on the same node, as well as several tolerations can be added on the same pod. But on this case, we will stay on the easy side.

## Example use case: Kubernetes dedicated node

Examples often explains concepts better. Let's delve into a recent use case from one of my projects. Imagine we're conducting a load testing process in a Kubernetes cluster, and we want all pods created during the load test to be scheduled on the same node. This ensures more realistic metrics and avoids interference from other pod traffic. The initial step is to add a taint to the desired node (using the command we discussed earlier). Once the taint is in place, the next step involves adding the corresponding toleration to the pods (either directly in the podSpec, as shown in the example, or via the Kubernetes API by dynamically creating pods).

At this point, any pod with the toleration has permission to use the node with the taint but can still use other nodes in the cluster. In other words, with the current configuration, only half the work is done. The goal is to attract the desired pods to the node. To achieve this, we leverage the first concept we explored: nodeAffinity. By defining a rule specifying that the pod can only be scheduled on nodes with the correct taint, we ensure that the node for load testing is exclusively used by pods created for that purpose.

## Conclusion

In essence, when we examine taints and tolerations in conjunction with node affinity, we uncover a potent mechanism for orchestrating workload scheduling within a Kubernetes cluster. By strategically employing taints and tolerations to restrict the deployment of workloads based on available resources, coupled with node affinity for making more fine-grained scheduling decisions based on node attributes, we unlock the potential to optimize resource utilization. This approach ensures that workloads find a fitting home on nodes aligning precisely with their specific requirements. This holistic strategy empowers efficient workload management and resource allocation in the Kubernetes ecosystem.